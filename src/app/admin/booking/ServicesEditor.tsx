"use client";

import { useEffect, useRef, useState, useTransition, useActionState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Plus, Check, X, ArrowUp, ArrowDown, AlertCircle, Layers, Info } from "lucide-react";
import type { ServiceCatalog, CatalogCategory, CatalogOption } from "@/lib/serviceCatalog-shared";
import {
  saveCategoryAction,
  saveOptionAction,
  toggleCategoryAction,
  toggleOptionAction,
  reorderCategoriesAction,
  reorderOptionsAction,
  createCategoryAction,
  deleteCategoryAction,
  createOptionAction,
  deleteOptionAction,
} from "../services/actions";

/**
 * Embedded inside Booking → Step 1. We're already inside the BookingForm
 * <form>, and HTML forbids nested forms. So every action here is dispatched
 * imperatively via useTransition / useActionState — no <form> tags at all.
 */
export default function ServicesEditor({ catalog }: { catalog: ServiceCatalog }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(catalog.categories.map((c) => c.id)));
  const [pending, startTransition] = useTransition();
  const [showNewCategory, setShowNewCategory] = useState(false);
  // Track which category currently has the "add sub-category" form open.
  const [addingOptionIn, setAddingOptionIn] = useState<string | null>(null);

  const toggleExpanded = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const runToggle = (action: (fd: FormData) => Promise<void>, id: string, currentEnabled: boolean) => {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("enabled", currentEnabled ? "false" : "true");
    startTransition(async () => { await action(fd); });
  };

  const runReorder = (action: (fd: FormData) => Promise<void>, ids: string[]) => {
    const fd = new FormData();
    for (const x of ids) fd.append("id", x);
    startTransition(async () => { await action(fd); });
  };

  const runDelete = (action: (fd: FormData) => Promise<void>, id: string, label: string, kind: "category" | "sub-category") => {
    const opts = catalog.options.filter((o) => o.category_id === id).length;
    const detail = kind === "category" && opts > 0
      ? `Delete "${label}"? Its ${opts} sub-categor${opts === 1 ? "y" : "ies"} and any tier prices for them will also be removed. This can't be undone.`
      : `Delete "${label}"? This can't be undone.`;
    if (!window.confirm(detail)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => { await action(fd); });
  };

  return (
    <div className="border-t border-white/5 pt-3 space-y-3">
      <div className="flex items-center gap-2">
        <Layers size={14} className="text-[#C9A84C]" />
        <span className="text-[11px] uppercase tracking-wider text-white/45">Service categories</span>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[#C9A84C]/20 bg-[#C9A84C]/[0.05] p-2.5 text-[11px] text-white/60">
        <Info size={12} className="text-[#C9A84C] shrink-0 mt-0.5" />
        <p>Rename / toggle / reorder edits show up live on the site. Newly-added categories and sub-categories are stored but stay hidden until pricing rules are wired up in code.</p>
      </div>

      {/* Add-category affordance */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/35">{catalog.categories.length} categor{catalog.categories.length === 1 ? "y" : "ies"}</span>
        {!showNewCategory && (
          <button
            type="button"
            onClick={() => setShowNewCategory(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-[#050E21]"
            style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
          >
            <Plus size={12} /> New category
          </button>
        )}
      </div>

      {showNewCategory && <NewCategoryForm onDone={() => setShowNewCategory(false)} />}

      <div className="space-y-2.5">
        {catalog.categories.map((cat, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === catalog.categories.length - 1;
          const opts = catalog.options.filter((o) => o.category_id === cat.id);
          const isOpen = expanded.has(cat.id);
          const isEditing = editingId === cat.id;
          const allIds = catalog.categories.map((c) => c.id);
          return (
            <div
              key={cat.id}
              className={`rounded-xl border ${cat.enabled ? "border-white/10" : "border-white/5"} bg-black/15 ${cat.enabled ? "" : "opacity-60"}`}
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                <IconBtn onClick={() => toggleExpanded(cat.id)} title={isOpen ? "Collapse" : "Expand"} Icon={isOpen ? ChevronUp : ChevronDown} />

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <CategoryForm cat={cat} onDone={() => setEditingId(null)} />
                  ) : (
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight">{cat.label}</p>
                        {cat.blurb && <p className="text-[11px] text-white/45 mt-0.5 line-clamp-2">{cat.blurb}</p>}
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {opts.length} sub-categor{opts.length === 1 ? "y" : "ies"}{!cat.enabled && " · hidden"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <ReorderBtn dir={-1} disabled={isFirst || pending} onClick={() => runReorder(reorderCategoriesAction, swap(allIds, cat.id, -1))} />
                        <ReorderBtn dir={1}  disabled={isLast  || pending} onClick={() => runReorder(reorderCategoriesAction, swap(allIds, cat.id, 1))} />
                        <ToggleBtn enabled={cat.enabled} disabled={pending} onClick={() => runToggle(toggleCategoryAction, cat.id, cat.enabled)} />
                        <IconBtn onClick={() => setEditingId(cat.id)} title="Edit" Icon={Pencil} />
                        <DangerBtn onClick={() => runDelete(deleteCategoryAction, cat.id, cat.label, "category")} disabled={pending} title="Delete category" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isOpen && (
                <OptionList
                  categoryId={cat.id}
                  options={opts}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  pending={pending}
                  adding={addingOptionIn === cat.id}
                  onStartAdd={() => setAddingOptionIn(cat.id)}
                  onCancelAdd={() => setAddingOptionIn(null)}
                  runToggle={runToggle}
                  runReorder={runReorder}
                  runDelete={runDelete}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Sub-category list -------------------------------------------------

function OptionList({
  categoryId,
  options,
  editingId,
  setEditingId,
  pending,
  adding,
  onStartAdd,
  onCancelAdd,
  runToggle,
  runReorder,
  runDelete,
}: {
  categoryId: string;
  options: CatalogOption[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  pending: boolean;
  adding: boolean;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  runToggle: (action: (fd: FormData) => Promise<void>, id: string, currentEnabled: boolean) => void;
  runReorder: (action: (fd: FormData) => Promise<void>, ids: string[]) => void;
  runDelete: (action: (fd: FormData) => Promise<void>, id: string, label: string, kind: "category" | "sub-category") => void;
}) {
  const allIds = options.map((o) => o.id);
  return (
    <>
      <ul className="border-t border-white/5 divide-y divide-white/5">
        {options.length === 0 && !adding && (
          <li className="px-3 py-3 text-[11px] text-white/35 pl-9">No sub-categories yet.</li>
        )}
        {options.map((opt, idx) => {
          const isEditing = editingId === opt.id;
          const isFirst = idx === 0;
          const isLast = idx === options.length - 1;
          return (
            <li key={opt.id} className={`px-3 py-2.5 ${opt.enabled ? "" : "opacity-55"}`}>
              {isEditing ? (
                <OptionForm opt={opt} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex items-start justify-between gap-2 flex-wrap pl-9">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      {opt.is_addon && (
                        <span className="inline-flex items-center rounded-md bg-[#10b981]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#10b981] ring-1 ring-[#10b981]/30">
                          Add-on
                        </span>
                      )}
                    </div>
                    {(opt.short_label || opt.blurb) && (
                      <p className="text-[11px] text-white/40">
                        {opt.short_label && <span>Short: {opt.short_label}</span>}
                        {opt.short_label && opt.blurb && <span className="text-white/25"> · </span>}
                        {opt.blurb}
                      </p>
                    )}
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {opt.is_addon ? "Interior add-on" : opt.recurring === "monthly" ? "Recurring" : "One-time"}
                      {!opt.is_addon && opt.has_outside_variant && " · outside variant"}
                      {!opt.is_addon && opt.has_addon && " · has add-on"}
                      {opt.is_addon && " · shows as toggle under a service"}
                      {!opt.enabled && " · hidden"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <ReorderBtn dir={-1} disabled={isFirst || pending} onClick={() => runReorder(reorderOptionsAction, swap(allIds, opt.id, -1))} />
                    <ReorderBtn dir={1}  disabled={isLast  || pending} onClick={() => runReorder(reorderOptionsAction, swap(allIds, opt.id, 1))} />
                    <ToggleBtn enabled={opt.enabled} disabled={pending} onClick={() => runToggle(toggleOptionAction, opt.id, opt.enabled)} />
                    <IconBtn onClick={() => setEditingId(opt.id)} title="Edit" Icon={Pencil} />
                    <DangerBtn onClick={() => runDelete(deleteOptionAction, opt.id, opt.label, "sub-category")} disabled={pending} title="Delete sub-category" />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {adding && (
          <li className="px-3 py-3">
            <NewOptionForm categoryId={categoryId} onDone={onCancelAdd} />
          </li>
        )}
      </ul>
      {!adding && (
        <div className="border-t border-white/5 px-3 py-2 flex justify-end">
          <button
            type="button"
            onClick={onStartAdd}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/75 disabled:opacity-50"
          >
            <Plus size={11} /> New sub-category
          </button>
        </div>
      )}
    </>
  );
}

// ---- Inline edit "forms" (actually plain divs — no <form>) -------------

function CategoryForm({ cat, onDone }: { cat: CatalogCategory; onDone: () => void }) {
  const [state, dispatch, pending] = useActionState(saveCategoryAction, {} as { error?: string; ok?: string });
  const [, startTransition] = useTransition();
  const labelRef = useRef<HTMLInputElement>(null);
  const blurbRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  const submit = () => {
    const fd = new FormData();
    fd.set("id", cat.id);
    fd.set("enabled", cat.enabled ? "true" : "false");
    fd.set("label", labelRef.current?.value ?? "");
    fd.set("blurb", blurbRef.current?.value ?? "");
    // useActionState's dispatch is async; calling it outside a transition
    // is a React-19 warning. Wrap it so pending/state stay consistent.
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="space-y-2" onKeyDown={(e) => onEnter(e, submit)}>
      <input
        ref={labelRef}
        defaultValue={cat.label}
        required
        autoFocus
        placeholder="Category name"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#C9A84C]"
      />
      <input
        ref={blurbRef}
        defaultValue={cat.blurb ?? ""}
        placeholder="Short description (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
      />
      <FormFooter onCancel={onDone} onSubmit={submit} pending={pending} error={state.error} />
    </div>
  );
}

function OptionForm({ opt, onDone }: { opt: CatalogOption; onDone: () => void }) {
  const [state, dispatch, pending] = useActionState(saveOptionAction, {} as { error?: string; ok?: string });
  const [, startTransition] = useTransition();
  const labelRef = useRef<HTMLInputElement>(null);
  const shortRef = useRef<HTMLInputElement>(null);
  const blurbRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  const submit = () => {
    const fd = new FormData();
    fd.set("id", opt.id);
    fd.set("enabled", opt.enabled ? "true" : "false");
    fd.set("label", labelRef.current?.value ?? "");
    fd.set("short_label", shortRef.current?.value ?? "");
    fd.set("blurb", blurbRef.current?.value ?? "");
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="space-y-2 pl-9" onKeyDown={(e) => onEnter(e, submit)}>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          ref={labelRef}
          defaultValue={opt.label}
          required
          autoFocus
          placeholder="Full label"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#C9A84C]"
        />
        <input
          ref={shortRef}
          defaultValue={opt.short_label ?? ""}
          placeholder="Short label (chip text)"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9A84C]"
        />
      </div>
      <input
        ref={blurbRef}
        defaultValue={opt.blurb ?? ""}
        placeholder="Short description (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
      />
      <FormFooter onCancel={onDone} onSubmit={submit} pending={pending} error={state.error} />
    </div>
  );
}

function FormFooter({
  onCancel,
  onSubmit,
  pending,
  error,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  pending: boolean;
  error?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
      >
        <Check size={12} /> {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/5">
        <X size={13} />
      </button>
      {error && <span className="text-[11px] text-red-300 inline-flex items-center gap-1"><AlertCircle size={12} /> {error}</span>}
    </div>
  );
}

// ---- Reusable button atoms (all type="button" → never submit parent form) ---

function IconBtn({
  onClick,
  title,
  Icon,
  disabled,
}: {
  onClick: () => void;
  title: string;
  Icon: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-40"
    >
      <Icon size={13} />
    </button>
  );
}

function ToggleBtn({ enabled, onClick, disabled }: { enabled: boolean; onClick: () => void; disabled?: boolean }) {
  // Matches the height (h-7) of the surrounding IconBtn / ReorderBtn so the
  // toolbar reads as one row. Knob is centered vertically and padded 4px
  // either side so the slide is symmetric.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={enabled ? "Disable" : "Enable"}
      aria-pressed={enabled}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        enabled
          ? "bg-[#C9A84C] ring-1 ring-inset ring-[#9C7A2A]/30"
          : "bg-white/10 ring-1 ring-inset ring-white/15"
      }`}
    >
      <span
        className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-[24px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ReorderBtn({ dir, onClick, disabled }: { dir: -1 | 1; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={dir === -1 ? "Move up" : "Move down"}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30"
    >
      {dir === -1 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
    </button>
  );
}

function DangerBtn({ onClick, title, disabled }: { onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
    >
      <Trash2 size={13} />
    </button>
  );
}

// ---- New-category inline form -----------------------------------------

function NewCategoryForm({ onDone }: { onDone: () => void }) {
  const [state, dispatch, pending] = useActionState(createCategoryAction, {} as { error?: string; ok?: string });
  const [, startTransition] = useTransition();
  const labelRef = useRef<HTMLInputElement>(null);
  const blurbRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  const submit = () => {
    const fd = new FormData();
    fd.set("label", labelRef.current?.value ?? "");
    fd.set("blurb", blurbRef.current?.value ?? "");
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-3 space-y-2" onKeyDown={(e) => onEnter(e, submit)}>
      <p className="text-[10px] uppercase tracking-wider text-white/45">New category</p>
      <input
        ref={labelRef}
        autoFocus
        required
        placeholder="Category name (e.g. Bike Detailing)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#C9A84C]"
      />
      <input
        ref={blurbRef}
        placeholder="Short description (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          <Check size={12} /> {pending ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={onDone} className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/5">
          <X size={13} />
        </button>
        {state.error && <span className="text-[11px] text-red-300 inline-flex items-center gap-1"><AlertCircle size={12} /> {state.error}</span>}
      </div>
    </div>
  );
}

// ---- New-option inline form (structural fields: recurring + flags) ----

function NewOptionForm({ categoryId, onDone }: { categoryId: string; onDone: () => void }) {
  const [state, dispatch, pending] = useActionState(createOptionAction, {} as { error?: string; ok?: string });
  const [, startTransition] = useTransition();
  const labelRef = useRef<HTMLInputElement>(null);
  const shortRef = useRef<HTMLInputElement>(null);
  const blurbRef = useRef<HTMLInputElement>(null);
  const [recurring, setRecurring] = useState<"monthly" | "one_time">("one_time");
  const [hasOutside, setHasOutside] = useState(false);
  const [hasAddon, setHasAddon] = useState(false);
  const [isAddon, setIsAddon] = useState(false);
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  const submit = () => {
    const fd = new FormData();
    fd.set("category_id", categoryId);
    fd.set("label", labelRef.current?.value ?? "");
    fd.set("short_label", shortRef.current?.value ?? "");
    fd.set("blurb", blurbRef.current?.value ?? "");
    fd.set("recurring", recurring);
    fd.set("has_outside_variant", hasOutside ? "true" : "false");
    fd.set("has_addon", hasAddon ? "true" : "false");
    fd.set("is_addon", isAddon ? "true" : "false");
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] p-3 space-y-2 ml-9" onKeyDown={(e) => onEnter(e, submit)}>
      <p className="text-[10px] uppercase tracking-wider text-white/45">New sub-category</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          ref={labelRef}
          autoFocus
          required
          placeholder="Full label"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#C9A84C]"
        />
        <input
          ref={shortRef}
          placeholder="Short label (chip)"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9A84C]"
        />
      </div>
      <input
        ref={blurbRef}
        placeholder="Short description (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
      />
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <FlagChip on={isAddon} onToggle={() => setIsAddon((v) => !v)} label="Is interior add-on" />
        {!isAddon && (
          <>
            <div className="inline-flex rounded-lg bg-black/30 ring-1 ring-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setRecurring("one_time")}
                className={`px-2.5 py-1 rounded-md font-semibold ${recurring === "one_time" ? "bg-[#C9A84C] text-[#050E21]" : "text-white/60"}`}
              >
                One-time
              </button>
              <button
                type="button"
                onClick={() => setRecurring("monthly")}
                className={`px-2.5 py-1 rounded-md font-semibold ${recurring === "monthly" ? "bg-[#C9A84C] text-[#050E21]" : "text-white/60"}`}
              >
                Recurring
              </button>
            </div>
            <FlagChip on={hasOutside} onToggle={() => setHasOutside((v) => !v)} label="Outside variant" />
            <FlagChip on={hasAddon} onToggle={() => setHasAddon((v) => !v)} label="Has add-on" />
          </>
        )}
      </div>
      <p className="text-[10px] text-white/35">
        {isAddon
          ? "An add-on shows as a toggle under the services in this category (never its own card). It gets one price line — set its per-tier price in the Cars tab."
          : "A “base” price line is always created. Outside variant adds an “outside” line; has add-on creates a category-level add-on line if one doesn’t exist."}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-[#050E21] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#9C7A2A,#C9A84C,#E8CC7A)" }}
        >
          <Check size={12} /> {pending ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={onDone} className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/5">
          <X size={13} />
        </button>
        {state.error && <span className="text-[11px] text-red-300 inline-flex items-center gap-1"><AlertCircle size={12} /> {state.error}</span>}
      </div>
    </div>
  );
}

function FlagChip({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ring-1 transition-colors ${
        on ? "bg-[#C9A84C]/20 text-[#E8CC7A] ring-[#C9A84C]/40" : "bg-white/5 text-white/55 ring-white/10"
      }`}
    >
      {on ? <Check size={11} /> : <Plus size={11} />} {label}
    </button>
  );
}

// ---- Helpers -----------------------------------------------------------

/** Pre-compute the order after moving `id` by `dir` positions. */
function swap(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const a = [...ids];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}

/**
 * Enter key inside a text input would normally submit the *parent* BookingForm.
 * Block default behavior and call our local submit instead.
 */
function onEnter(e: React.KeyboardEvent<HTMLDivElement>, submit: () => void) {
  if (e.key !== "Enter") return;
  const tag = (e.target as HTMLElement).tagName;
  if (tag !== "INPUT") return;
  e.preventDefault();
  submit();
}
