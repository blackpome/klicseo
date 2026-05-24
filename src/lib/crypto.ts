import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// Application-layer field encryption using AES-256-GCM.
//
// Key lives in process.env.APP_ENCRYPTION_KEY (32 bytes, hex-encoded). The
// secret is held in memory; we never write it to the DB, never log it. Losing
// the key permanently bricks every encrypted field — back it up the same way
// you back up SUPABASE_SERVICE_ROLE_KEY.
//
// Wire format:  "enc:v1:" + base64( iv (12B) | tag (16B) | ciphertext )
//
// The prefix makes ciphertext distinguishable from legacy plaintext so the
// backfill is idempotent and a partial migration doesn't double-encrypt.

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
export const ENC_PREFIX = "enc:v1:";

let cached: Buffer | null = null;
function key(): Buffer {
  if (cached) return cached;
  const env = process.env.APP_ENCRYPTION_KEY;
  if (!env) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate a 32-byte hex value with " +
        "`openssl rand -hex 32` and add it to your environment.",
    );
  }
  const buf = Buffer.from(env, "hex");
  if (buf.length !== KEY_LEN) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${buf.length}). ` +
        "Use `openssl rand -hex 32` to generate a valid one.",
    );
  }
  cached = buf;
  return buf;
}

/** True if a value already looks like sealed ciphertext from this module. */
export function isSealed(v: unknown): v is string {
  return typeof v === "string" && v.startsWith(ENC_PREFIX);
}

/**
 * Encrypt a plaintext string. Returns null for null/undefined input. Is
 * idempotent — a value that's already sealed is returned untouched.
 */
export function seal(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  if (isSealed(plaintext)) return plaintext;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/**
 * Decrypt a sealed string. Returns plaintext input as-is (tolerates pre-
 * encryption rows). Throws on a malformed or tampered ciphertext.
 */
export function unseal(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!isSealed(value)) return value;
  const packed = Buffer.from(value.slice(ENC_PREFIX.length), "base64");
  if (packed.length < IV_LEN + TAG_LEN + 1) throw new Error("Ciphertext too short.");
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = packed.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/**
 * Encrypt the named fields on a row in place. Fields not present (or null)
 * are skipped; already-sealed values stay untouched (idempotent).
 */
export function sealFields<T extends object>(row: T, fields: readonly string[]): T {
  const out = { ...row } as unknown as Record<string, unknown>;
  for (const f of fields) {
    if (!(f in out)) continue;
    const v = out[f];
    if (v == null) continue;
    if (typeof v === "string") out[f] = seal(v);
  }
  return out as unknown as T;
}

/** Decrypt the named fields on a row in place. Tolerates plaintext + null. */
export function unsealFields<T extends object>(row: T | null | undefined, fields: readonly string[]): T | null {
  if (!row) return null;
  const out = { ...row } as unknown as Record<string, unknown>;
  for (const f of fields) {
    if (!(f in out)) continue;
    const v = out[f];
    if (typeof v === "string") out[f] = unseal(v);
  }
  return out as unknown as T;
}

// --- Phone normalisation + keyed hash --------------------------------------
//
// We can't ILIKE on encrypted phones, so we keep a deterministic HMAC hash
// alongside for exact-match lookup. Normalisation makes "+91 98765 43210" and
// "9876543210" hash to the same value.

/** Strip non-digits and drop a 91 country-code prefix if the result is 12 digits. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  // Indian numbers: 10 digits, sometimes prefixed with 91.
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

/**
 * HMAC-SHA256 of a normalised phone, keyed by APP_ENCRYPTION_KEY. Empty
 * input → null (no row hash). Resistant to offline brute-force only as long
 * as the key stays secret.
 */
export function phoneHash(phone: string | null | undefined): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  // Domain-separated derivation so the same key can be used for both AEAD
  // encryption (above) and HMAC here.
  const hmac = createHmac("sha256", key());
  hmac.update("phone-hash-v1:");
  hmac.update(n);
  return hmac.digest("hex");
}
