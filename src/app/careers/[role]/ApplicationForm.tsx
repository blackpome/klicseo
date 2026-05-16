"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { submitApplicationAction } from "../actions";
import { attachCompressedFileTo, type CompressOptions } from "@/lib/compress-image";
import type { JobRole } from "@/lib/employees-shared";

const fieldCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]";
const labelCls = "text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1 block";

// Aadhaar must stay legible — keep more pixels. Profile photo is just a face,
// 1200px is plenty.
const COMPRESS_AADHAAR: CompressOptions = { maxDim: 2000, quality: 0.85 };
const COMPRESS_PROFILE: CompressOptions = { maxDim: 1200, quality: 0.8 };

export default function ApplicationForm({ role }: { role: JobRole }) {
  const [state, action, pending] = useActionState(submitApplicationAction, { ok: false });
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement | null>(null);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
    opts: CompressOptions,
  ) {
    setCompressing((m) => ({ ...m, [key]: true }));
    try {
      await attachCompressedFileTo(e.currentTarget, opts);
    } finally {
      setCompressing((m) => ({ ...m, [key]: false }));
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

      <label className="block">
        <span className={labelCls}>Location *</span>
        <input name="location" required placeholder="Area, city" className={fieldCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Aadhaar number</span>
        <input name="aadhaar_number" inputMode="numeric" maxLength={14} className={`${fieldCls} font-mono`} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>
            Aadhaar photo *
            {compressing.aadhaar && <CompressingTag />}
          </span>
          <input
            type="file"
            name="aadhaar_photo"
            required
            accept="image/*,application/pdf"
            onChange={(e) => handleFileChange(e, "aadhaar", COMPRESS_AADHAAR)}
            className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
          />
        </label>
        <label className="block">
          <span className={labelCls}>
            Profile photo *
            {compressing.profile && <CompressingTag />}
          </span>
          <input
            type="file"
            name="profile_photo"
            required
            accept="image/*"
            onChange={(e) => handleFileChange(e, "profile", COMPRESS_PROFILE)}
            className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
          />
        </label>
      </div>

      <div>
        <span className={labelCls}>Signature *</span>
        <SignaturePad onChange={setSignatureDataUrl} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/55 leading-relaxed">
        <p className="mb-2">
          <strong className="text-white/80">Terms &amp; conditions:</strong> the full hiring T&amp;C document
          will be added here. By submitting, you agree to provide accurate information and consent to a
          verification call.
        </p>
        <label className="flex items-center gap-2 text-white/80">
          <input type="checkbox" name="terms_accepted" required /> I accept the terms and conditions
        </label>
      </div>

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
