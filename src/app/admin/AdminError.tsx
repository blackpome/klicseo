import { AlertTriangle } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

// Renders a friendly card for caught DB / setup errors on admin pages.
// Server-side; safe to import from any server component.
export default function AdminError({ err }: { err: unknown }) {
  const info = friendlyDbError(err);
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.04] p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-amber-200 mb-1">{info.title}</h2>
          {info.hint && <p className="text-sm text-white/80 mb-3">{info.hint}</p>}
          <pre className="text-[11px] text-white/45 whitespace-pre-wrap break-all bg-black/30 rounded-md p-2 border border-white/5">
            {info.detail}
          </pre>
        </div>
      </div>
    </div>
  );
}
