"use client";

import { useState } from "react";
import { Download, FileText, Calendar } from "lucide-react";

/**
 * Date-range + format export controls for an admin list page.
 *
 * - CSV download → navigates to `${endpoint}?format=csv&from=&to=`; the route
 *   sends a `Content-Disposition: attachment` so the browser triggers a save.
 * - PDF download → opens `${endpoint}?format=pdf&from=&to=` in a new tab. The
 *   route returns a print-styled HTML page that auto-runs `window.print()`;
 *   user picks "Save as PDF" in the system print dialog. No PDF lib needed.
 *
 * Dates are inclusive day boundaries in IST (handled server-side). Leaving
 * both blank = full export.
 */
export default function ExportToolbar({
  endpoint,
  label,
}: {
  /** Absolute path to the export route, e.g. "/api/admin/leads-export". */
  endpoint: string;
  /** Short subject label used in titles/aria, e.g. "leads" or "employees". */
  label: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();

  const csvHref = `${endpoint}?format=csv${qs ? `&${qs}` : ""}`;
  const pdfHref = `${endpoint}?format=pdf${qs ? `&${qs}` : ""}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-white/45 mr-1">
          <Calendar size={12} /> Date range
        </div>

        <label className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C]">
          <span className="pl-2 text-[10px] uppercase tracking-wider text-white/35">From</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={`Export ${label} — from date`}
            className="bg-transparent px-2 py-1.5 text-xs focus:outline-none"
          />
        </label>

        <label className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 focus-within:border-[#C9A84C]">
          <span className="pl-2 text-[10px] uppercase tracking-wider text-white/35">To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label={`Export ${label} — to date`}
            className="bg-transparent px-2 py-1.5 text-xs focus:outline-none"
          />
        </label>

        {(from || to) && (
          <button
            type="button"
            onClick={() => { setFrom(""); setTo(""); }}
            className="text-[11px] text-white/45 hover:text-white px-1"
          >
            Clear
          </button>
        )}

        <span className="text-white/20 mx-1">·</span>

        <a
          href={csvHref}
          // download attribute is honoured because the server sets a filename.
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#050E21]"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          aria-label={`Download ${label} as CSV`}
        >
          <Download size={13} /> CSV
        </a>

        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 ring-1 ring-white/10 hover:bg-white/15"
          aria-label={`Open printable ${label} for PDF save`}
          title="Opens a print-ready page. Use your browser's Save as PDF."
        >
          <FileText size={13} /> PDF
        </a>

        <span className="ml-auto text-[11px] text-white/35">
          {from || to ? "Range applies to created date" : "Full export"}
        </span>
      </div>
    </div>
  );
}
