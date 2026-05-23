"use client";

import { useActionState } from "react";
import { Upload, RotateCcw, Check, AlertCircle, Loader2 } from "lucide-react";
import { uploadMediaAction, resetMediaAction } from "./actions";
import { MEDIA_DEFS, resolveMedia, hasCustomMedia, type Media, type MediaKey } from "@/lib/site-settings-shared";

function MediaRow({ mediaKey, label, media }: { mediaKey: MediaKey; label: string; media: Media }) {
  const [state, action, pending] = useActionState(uploadMediaAction, {} as { error?: string; ok?: string });
  const custom = hasCustomMedia(media, mediaKey);
  const { url, type } = resolveMedia(media, mediaKey);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[11px] text-white/40">
            {custom ? `Custom ${type} uploaded` : "Using default video"}
          </p>
        </div>
        {/* Reset is always available; no-op disabled when already on default */}
        <form action={resetMediaAction}>
          <input type="hidden" name="key" value={mediaKey} />
          <button
            disabled={!custom}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={13} /> Reset to default
          </button>
        </form>
      </div>

      {/* Preview */}
      {type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="w-full max-h-44 rounded-lg bg-black/30 object-contain" />
      ) : (
        <video key={url} src={url} muted loop playsInline controls className="w-full max-h-44 rounded-lg bg-black/30 object-contain" />
      )}

      {/* Upload (video or image) */}
      <form action={action} className="flex items-center gap-3 flex-wrap">
        <input type="hidden" name="key" value={mediaKey} />
        <input
          type="file"
          name="file"
          accept="video/*,image/*"
          required
          className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15 file:cursor-pointer"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {pending ? "Uploading…" : "Upload new"}
        </button>
        {state.ok && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><Check size={12} /> {state.ok}</span>}
        {state.error && <span className="inline-flex items-center gap-1 text-[11px] text-red-300"><AlertCircle size={12} /> {state.error}</span>}
      </form>
      <p className="text-[10px] text-white/30">Video (MP4/WebM · max 25 MB) or image (JPG/PNG/WebP · max 8 MB).</p>
    </div>
  );
}

export default function MediaManager({ media }: { media: Media }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 max-w-lg">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Hero & package media</h2>
        <p className="text-[11px] text-white/35">Each slot accepts a video or an image. Reset returns it to the built-in default.</p>
      </div>
      {MEDIA_DEFS.map((m) => (
        <MediaRow key={m.key} mediaKey={m.key} label={m.label} media={media} />
      ))}
    </div>
  );
}
