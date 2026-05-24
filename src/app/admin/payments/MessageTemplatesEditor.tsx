"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Check, AlertCircle, RotateCcw } from "lucide-react";
import { MESSAGE_TEMPLATE_DEFS, MESSAGE_TEMPLATE_DEFAULTS, type MessageTemplates } from "@/lib/site-settings-shared";
import { saveMessageTemplatesAction } from "./actions";

/**
 * Collapsible editor for the WhatsApp message templates used by Payment rows.
 * Supports placeholders {name} {service} {amount} {month} — admin can rephrase
 * freely; defaults are restorable per-field.
 */
export default function MessageTemplatesEditor({ initial }: { initial: MessageTemplates }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveMessageTemplatesAction, {} as { error?: string; ok?: string });
  const [values, setValues] = useState<MessageTemplates>(initial);

  const updateField = (k: keyof MessageTemplates, v: string) =>
    setValues((p) => ({ ...p, [k]: v }));

  const reset = (k: keyof MessageTemplates) =>
    setValues((p) => ({ ...p, [k]: MESSAGE_TEMPLATE_DEFAULTS[k] }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <MessageCircle size={14} className="text-[#C9A84C]" />
          WhatsApp message templates
        </span>
        {open ? <ChevronUp size={14} className="text-white/45" /> : <ChevronDown size={14} className="text-white/45" />}
      </button>

      {open && (
        <form action={action} className="border-t border-white/5 p-4 space-y-3">
          <p className="text-[11px] text-white/50">
            Use these placeholders anywhere in a template:{" "}
            <code className="text-[#C9A84C]">{"{name}"}</code>{" "}
            <code className="text-[#C9A84C]">{"{service}"}</code>{" "}
            <code className="text-[#C9A84C]">{"{amount}"}</code>{" "}
            <code className="text-[#C9A84C]">{"{month}"}</code>
          </p>

          {MESSAGE_TEMPLATE_DEFS.map((def) => {
            const v = values[def.key];
            const isDefault = v === MESSAGE_TEMPLATE_DEFAULTS[def.key];
            return (
              <label key={def.key} className="block">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-white/80">{def.label}</span>
                  <button
                    type="button"
                    onClick={() => reset(def.key)}
                    disabled={isDefault}
                    title="Reset to default"
                    className="inline-flex items-center gap-1 text-[10px] text-white/45 hover:text-white disabled:opacity-30"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
                <textarea
                  name={`tpl_${def.key}`}
                  value={v}
                  onChange={(e) => updateField(def.key, e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] resize-y"
                />
                <p className="text-[10px] text-white/35 mt-1">{def.help}</p>
              </label>
            );
          })}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-lg font-bold text-sm text-[#050E21] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
            >
              {pending ? "Saving…" : "Save templates"}
            </button>
            {state.ok && <span className="inline-flex items-center gap-1 text-[12px] text-emerald-300"><Check size={13} /> {state.ok}</span>}
            {state.error && <span className="inline-flex items-center gap-1 text-[12px] text-red-300"><AlertCircle size={13} /> {state.error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
