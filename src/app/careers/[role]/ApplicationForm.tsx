"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SignaturePad from "@/components/SignaturePad";
import { submitApplicationAction } from "../actions";
import { attachCompressedFileTo, type CompressOptions } from "@/lib/compress-image";
import { APP_FIELD_DEFAULTS, type ApplicationFields } from "@/lib/jobs-shared";

const fieldCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]";
const labelCls = "text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1 block";

// Max size of the *uploaded* file. Photos are auto-compressed under this cap,
// so applicants can still pick large originals — only the result must fit.
const MAX_FILE_MB = 2;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// Aadhaar must stay legible — keep more pixels. Profile photo is just a face,
// 1200px is plenty. Both are compressed under the upload cap.
const COMPRESS_AADHAAR: CompressOptions = { maxDim: 2000, quality: 0.85, targetSize: MAX_FILE_BYTES };
const COMPRESS_PROFILE: CompressOptions = { maxDim: 1200, quality: 0.8, targetSize: MAX_FILE_BYTES };

export default function ApplicationForm({
  role,
  terms,
  fields = APP_FIELD_DEFAULTS,
}: {
  role: string;
  terms?: string | null;
  fields?: ApplicationFields;
}) {
  const [state, action, pending] = useActionState(submitApplicationAction, { ok: false });
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<Record<string, boolean>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string | null>>({});
  const [termsOpen, setTermsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const termsText =
    terms?.trim() || "By submitting, you agree to provide accurate information and consent to a verification call.";

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    opts: CompressOptions,
  ) {
    const inputEl = e.currentTarget;
    setFileErrors((m) => ({ ...m, [key]: null }));

    setCompressing((m) => ({ ...m, [key]: true }));
    try {
      await attachCompressedFileTo(inputEl, opts);
    } finally {
      setCompressing((m) => ({ ...m, [key]: false }));
    }

    // Reject if it still can't fit under the cap after compression.
    const out = inputEl.files?.[0];
    if (out && out.size > MAX_FILE_BYTES) {
      inputEl.value = "";
      setFileErrors((m) => ({ ...m, [key]: `Couldn’t get this under ${MAX_FILE_MB} MB — try a smaller photo.` }));
    }
  }

  const busy = pending || Object.values(compressing).some(Boolean);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={36} />
        <h3 className="text-xl font-bold mb-1">Application received</h3>
        <p className="text-white/60 text-sm">
          Thanks! We&apos;ll review your details and call you back shortly.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="job_role" value={role} />
      <input type="hidden" name="signature_data_url" value={signatureDataUrl ?? ""} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>Full name *</span>
          <input name="name" required className={fieldCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Phone *</span>
          <input name="phone" required inputMode="tel" className={fieldCls} />
        </label>
      </div>

      {fields.location.enabled && (
        <label className="block">
          <span className={labelCls}>Location {fields.location.required && "*"}</span>
          <input name="location" required={fields.location.required} placeholder="Area, city" className={fieldCls} />
        </label>
      )}

      {fields.aadhaar_number.enabled && (
        <label className="block">
          <span className={labelCls}>Aadhaar number {fields.aadhaar_number.required && "*"}</span>
          <input name="aadhaar_number" required={fields.aadhaar_number.required} inputMode="numeric" maxLength={14} className={`${fieldCls} font-mono`} />
        </label>
      )}

      {(fields.aadhaar_photo.enabled || fields.profile_photo.enabled) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.aadhaar_photo.enabled && (
            <label className="block">
              <span className={labelCls}>
                Aadhaar photo {fields.aadhaar_photo.required && "*"}
                {compressing.aadhaar && <CompressingTag />}
              </span>
              <input
                type="file"
                name="aadhaar_photo"
                required={fields.aadhaar_photo.required}
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, "aadhaar", COMPRESS_AADHAAR)}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
              />
              {fileErrors.aadhaar ? (
                <span className="mt-1 block text-[10px] text-red-300">{fileErrors.aadhaar}</span>
              ) : (
                <span className="mt-1 block text-[10px] text-white/35">Image or PDF · max {MAX_FILE_MB} MB</span>
              )}
            </label>
          )}
          {fields.profile_photo.enabled && (
            <label className="block">
              <span className={labelCls}>
                Profile photo {fields.profile_photo.required && "*"}
                {compressing.profile && <CompressingTag />}
              </span>
              <input
                type="file"
                name="profile_photo"
                required={fields.profile_photo.required}
                accept="image/*"
                onChange={(e) => handleFileChange(e, "profile", COMPRESS_PROFILE)}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
              />
              {fileErrors.profile ? (
                <span className="mt-1 block text-[10px] text-red-300">{fileErrors.profile}</span>
              ) : (
                <span className="mt-1 block text-[10px] text-white/35">Image · max {MAX_FILE_MB} MB</span>
              )}
            </label>
          )}
        </div>
      )}

      {fields.signature.enabled && (
        <div>
          <span className={labelCls}>Signature {fields.signature.required && "*"}</span>
          <SignaturePad onChange={setSignatureDataUrl} />
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/55 leading-relaxed">
        <label className="flex items-center gap-2 text-white/80">
          <input type="checkbox" name="terms_accepted" required /> I accept the{" "}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="text-[#C9A84C] underline underline-offset-2 hover:text-[#E8CC7A]"
          >
            terms &amp; conditions
          </button>
        </label>
      </div>

      {/* Terms & conditions dialog */}
      {termsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTermsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1430] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-playfair)" }}>Terms &amp; conditions</h3>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm text-white/70 leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:text-white/90 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5 [&_a]:text-[#C9A84C] [&_a]:underline [&_strong]:text-white/90 [&_strong]:font-semibold [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_hr]:my-3 [&_hr]:border-white/10 [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-3 [&_blockquote]:text-white/60">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{termsText}</ReactMarkdown>
            </div>
            <div className="border-t border-white/10 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-[#050E21]"
                style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {state.error && <p className="text-[12px] text-red-300">{state.error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-[#050E21] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        {pending
          ? "Submitting…"
          : Object.values(compressing).some(Boolean)
          ? "Preparing photos…"
          : "Submit application"}
      </button>
    </form>
  );
}

function CompressingTag() {
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-white/55 normal-case tracking-normal font-normal">
      <Loader2 size={10} className="animate-spin" /> compressing…
    </span>
  );
}
