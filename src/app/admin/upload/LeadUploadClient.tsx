"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ListPlus,
  ShieldCheck,
  Download,
  Info,
  Loader2,
  Table as TableIcon,
  Check,
} from "lucide-react";
import {
  parseSpreadsheetBuffer,
  autoDetectMapping,
  normalizeRowsWithMapping,
  CANONICAL_LEAD_FIELDS,
  type ParsedSpreadsheet,
  type ColumnMapping,
  type NormalizedImportRow,
} from "@/lib/lead-import-parser";
import { formatPhone } from "@/lib/phone-shared";
import { bulkImportLeadsAction, type BulkImportActionResult } from "../actions";
import type { LeadListRow } from "@/lib/leadLists-shared";
import type { AdminUserRow } from "@/lib/admin-users-shared";
import type { LeadStatus } from "@/lib/leads-shared";

interface LeadUploadClientProps {
  existingLists: LeadListRow[];
  assignableAdmins: AdminUserRow[];
  preselectedListId?: string;
}

export default function LeadUploadClient({
  existingLists,
  assignableAdmins,
  preselectedListId = "",
}: LeadUploadClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state: 1 = upload, 2 = mapping & preview, 3 = configuring & importing, 4 = complete
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File & parsed state
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [saveUnmapped, setSaveUnmapped] = useState(true);

  // Import options
  const [listMode, setListMode] = useState<"none" | "new" | "existing">(
    preselectedListId ? "existing" : existingLists.length > 0 ? "new" : "none",
  );
  const [selectedListId, setSelectedListId] = useState(preselectedListId);
  const [newListName, setNewListName] = useState("");
  const [assignedAdminUserId, setAssignedAdminUserId] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>("new");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update" | "allow">("skip");

  // Execution state
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<BulkImportActionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // 1. Handle file selection
  const handleFile = async (selectedFile: File) => {
    setErrorMessage(null);
    if (!selectedFile) return;

    const validExts = [".xlsx", ".xls", ".csv"];
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage("Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file (.csv).");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = parseSpreadsheetBuffer(buffer, selectedFile.name);

      if (result.rawRows.length === 0) {
        setErrorMessage("The uploaded spreadsheet is empty or has no data rows.");
        return;
      }

      setFile(selectedFile);
      setParsed(result);

      // Auto-detect mappings
      const detected = autoDetectMapping(result.headers);
      setMapping(detected);

      // Suggest list name if not set
      if (!newListName) {
        const base = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9 ]/g, " ").trim();
        const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        setNewListName(`${base} (${dateStr})`);
      }

      setStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to read file.";
      setErrorMessage(`Error parsing file: ${msg}`);
    }
  };

  // 2. Computed normalized rows based on current mapping
  const normalizedRows: NormalizedImportRow[] = useMemo(() => {
    if (!parsed) return [];
    return normalizeRowsWithMapping(parsed.rawRows, mapping, saveUnmapped);
  }, [parsed, mapping, saveUnmapped]);

  const stats = useMemo(() => {
    const total = normalizedRows.length;
    const valid = normalizedRows.filter((r) => r.isValid).length;
    const invalid = total - valid;
    const withCar = normalizedRows.filter((r) => Boolean(r.car_number || r.car_model)).length;
    const withPincode = normalizedRows.filter((r) => Boolean(r.pincode)).length;
    return { total, valid, invalid, withCar, withPincode };
  }, [normalizedRows]);

  // Unmapped source columns that will be saved in custom_fields
  const unmappedColumns = useMemo(() => {
    if (!parsed) return [];
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    return parsed.headers.filter((h) => !mapped.has(h));
  }, [parsed, mapping]);

  // 3. Handle commit import
  const handleExecuteImport = () => {
    setErrorMessage(null);
    const validRows = normalizedRows.filter((r) => r.isValid);

    if (validRows.length === 0) {
      setErrorMessage("No valid rows to import. Please check column mappings for Phone Number.");
      return;
    }

    if (listMode === "new" && !newListName.trim()) {
      setErrorMessage("Please enter a name for the new Lead List or select 'No list'.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          leads: validRows.map((r) => ({
            name: r.name,
            phone: r.phone,
            car_number: r.car_number,
            car_brand: r.car_brand,
            car_model: r.car_model,
            vehicle_type: r.vehicle_type,
            address: r.address,
            pincode: r.pincode,
            custom_fields: r.custom_fields,
          })),
          targetListId: listMode === "existing" ? selectedListId : null,
          newListName: listMode === "new" ? newListName.trim() : null,
          assignedAdminUserId: listMode === "new" && assignedAdminUserId ? assignedAdminUserId : null,
          defaultStatus,
          duplicateStrategy,
          sourceFileName: file?.name,
        };

        const res = await bulkImportLeadsAction(payload);
        if (!res.success && res.error) {
          setErrorMessage(res.error);
        } else {
          setImportResult(res);
          setStep(4);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Import failed.";
        setErrorMessage(msg);
      }
    });
  };

  // Sample CSV generator
  const downloadSampleCsv = () => {
    const csvContent =
      "Owner Name,Mobile,Reg. No,Vehicle Maker,Vehicle Model,Vehicle Class,Permanent Address,PIN,Fuel Type,Sale Amount\n" +
      "SOBAN VISWANATHAN,8056741915,TN07DP3488,NISSAN MOTOR INDIA PVT LTD,NISSAN MAGNITE ACENTA,Motor Car,\"8, 5TH MAIN ROAD, VELACHERY\",600042,PETROL,717147\n" +
      "PRIYANKA G,9677377077,TN22EE4941,VOLKSWAGEN INDIA,VOLKSWAGEN TAIGUN GT PLUS,Motor Car,\"PLOT NO 2017 APPASWAMY BANYAN HOUSE ALANDHUR\",600016,PETROL,1973900\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "klicseo_leads_sample_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFile(null);
    setParsed(null);
    setMapping({});
    setImportResult(null);
    setErrorMessage(null);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      {/* Progress step bar */}
      <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-4">
        {[
          { num: 1, title: "1. Upload File" },
          { num: 2, title: "2. Map & Preview" },
          { num: 3, title: "3. Import & Assign" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 text-xs font-semibold pb-1 border-b-2 transition-all ${
              step >= s.num
                ? "border-[#C9A84C] text-[#E8CC7A]"
                : "border-transparent text-white/30"
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                step >= s.num ? "bg-[#C9A84C] text-[#050E21]" : "bg-white/10 text-white/50"
              }`}
            >
              {s.num}
            </span>
            <span>{s.title}</span>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-3">
          <AlertTriangle className="shrink-0 text-red-400 mt-0.5" size={18} />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* STEP 1: FILE DROPZONE */}
      {step === 1 && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              isDragging
                ? "border-[#C9A84C] bg-[#C9A84C]/10 scale-[1.01]"
                : "border-white/15 bg-white/[0.02] hover:border-[#C9A84C]/50 hover:bg-white/[0.04]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#C9A84C]/15 ring-1 ring-[#C9A84C]/30 text-[#C9A84C] mb-4">
              <UploadCloud size={32} />
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">
              Drop your spreadsheet here, or <span className="text-[#C9A84C] underline">browse</span>
            </h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mb-6">
              Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files.
              Ideal for RTO vehicle databases, telecaller call sheets, or offline lead lists.
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Phone numbers & addresses are encrypted at rest with AES-256-GCM</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-white/50 px-1">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-[#C9A84C]" />
              <span>Reference sample: matching RTO sheet format with 19 columns</span>
            </div>
            <button
              onClick={downloadSampleCsv}
              type="button"
              className="inline-flex items-center gap-1.5 text-[#C9A84C] hover:underline"
            >
              <Download size={13} />
              Download Sample CSV Template
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING & PREVIEW */}
      {step === 2 && parsed && (
        <div className="space-y-6">
          {/* File summary pill */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#C9A84C]/15 text-[#C9A84C]">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{parsed.fileName}</p>
                <p className="text-xs text-white/40">
                  {parsed.totalRows} rows found · {parsed.headers.length} columns detected
                </p>
              </div>
            </div>
            <button
              onClick={resetAll}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 inline-flex items-center gap-1.5"
            >
              <RotateCcw size={12} /> Choose another file
            </button>
          </div>

          {/* Mapping Grid */}
          <div className="rounded-2xl border border-white/10 bg-[#0B172E] p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Column Mapping</h3>
                <p className="text-xs text-white/50">
                  Verify how the spreadsheet columns map to Klicseo lead fields.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveUnmapped}
                  onChange={(e) => setSaveUnmapped(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-[#C9A84C] focus:ring-0"
                />
                <span>Save unmapped columns into Lead Custom Fields</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CANONICAL_LEAD_FIELDS.map((field) => {
                const selectedHeader = mapping[field.key] || "";
                const isMatched = Boolean(selectedHeader);
                return (
                  <div
                    key={field.key}
                    className="flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-400">*</span>}
                      </span>
                      {isMatched ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
                          Matched
                        </span>
                      ) : field.required ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 font-medium">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                          Optional
                        </span>
                      )}
                    </div>

                    <select
                      value={selectedHeader}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className={`w-full rounded-lg px-3 py-2 text-xs bg-[#050E21] border focus:outline-none focus:border-[#C9A84C] text-white ${
                        isMatched
                          ? "border-[#C9A84C]/40 text-white"
                          : field.required
                          ? "border-red-500/40 text-red-300"
                          : "border-white/10 text-white/50"
                      }`}
                    >
                      <option value="">— Skip / Do not map —</option>
                      {parsed.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-white/40">{field.description}</span>
                  </div>
                );
              })}
            </div>

            {saveUnmapped && unmappedColumns.length > 0 && (
              <div className="pt-2 text-xs text-white/60">
                <span className="text-white/40 font-medium">Will be saved to Custom Fields: </span>
                <span className="text-[#E8CC7A]">
                  {unmappedColumns.join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Validation & Preview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">Total Rows</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{stats.valid}</div>
              <div className="text-[11px] text-emerald-400/70 uppercase tracking-wider">Valid Contacts</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-lg font-bold text-[#C9A84C]">{stats.withCar}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">With Vehicle Info</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-lg font-bold text-sky-400">{stats.withPincode}</div>
              <div className="text-[11px] text-sky-400/70 uppercase tracking-wider">Auto-Area Match</div>
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="rounded-2xl border border-white/10 bg-[#0B172E] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon size={16} className="text-[#C9A84C]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Data Preview (First {Math.min(10, normalizedRows.length)} rows)
                </span>
              </div>
              <span className="text-xs text-white/40">
                {stats.invalid > 0 ? (
                  <span className="text-amber-400 font-medium">
                    {stats.invalid} invalid rows will be skipped
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">All rows valid</span>
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-white/40">
                    <th className="sticky left-0 bg-[#071228] z-20 py-2.5 px-3 w-12 min-w-[48px] border-r border-white/[0.04]">#</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Car #</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Pincode</th>
                    <th className="py-2.5 px-3">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {normalizedRows.slice(0, 10).map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={`group hover:bg-white/[0.02] ${
                        !r.isValid ? "bg-red-500/[0.03]" : ""
                      }`}
                    >
                      <td className="sticky left-0 z-10 w-12 min-w-[48px] bg-[#050E21] group-hover:bg-[#091733] py-2.5 px-3 text-white/30 border-r border-white/[0.04]">{r.rowNumber}</td>
                      <td className="py-2.5 px-3">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                            <CheckCircle2 size={12} /> Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-red-400"
                            title={r.validationError}
                          >
                            <XCircle size={12} /> {r.validationError || "Invalid"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white max-w-[140px] truncate">
                        {r.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#E8CC7A]">
                        {r.phone ? formatPhone(r.phone) : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white/80 uppercase">
                        {r.car_number || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-white/70 max-w-[180px] truncate">
                        {r.car_brand || r.car_model
                          ? `${r.car_brand ?? ""} ${r.car_model ?? ""}`.trim()
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white/60">
                        {r.pincode || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-white/50 max-w-[200px] truncate">
                        {r.address || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              type="button"
              className="px-4 py-2 rounded-xl border border-white/10 text-xs text-white/70 hover:bg-white/5 hover:text-white inline-flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={stats.valid === 0}
              type="button"
              className="px-6 py-2.5 rounded-xl bg-[#C9A84C] text-xs font-semibold text-[#050E21] hover:bg-[#E8CC7A] disabled:opacity-50 transition-all inline-flex items-center gap-2"
            >
              Next: Configure Import ({stats.valid} Leads) <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: IMPORT OPTIONS & CONFIRMATION */}
      {step === 3 && parsed && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0B172E] p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-playfair)" }}>
                Import & Assignment Settings
              </h3>
              <p className="text-xs text-white/50">
                Choose how these {stats.valid} leads should be grouped and assigned.
              </p>
            </div>

            {/* Target Lead List */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                <ListPlus size={14} className="text-[#C9A84C]" /> Target Lead List
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setListMode("new")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    listMode === "new"
                      ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
                  }`}
                >
                  <div className="font-semibold text-xs text-white mb-1">Create New List</div>
                  <div className="text-[11px] text-white/40">
                    Group all uploaded leads into a fresh list for telecallers
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setListMode("existing")}
                  disabled={existingLists.length === 0}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    listMode === "existing"
                      ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5 disabled:opacity-30"
                  }`}
                >
                  <div className="font-semibold text-xs text-white mb-1">Add to Existing List</div>
                  <div className="text-[11px] text-white/40">
                    Append these leads to an existing list
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setListMode("none")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    listMode === "none"
                      ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
                  }`}
                >
                  <div className="font-semibold text-xs text-white mb-1">No List (All Leads Only)</div>
                  <div className="text-[11px] text-white/40">
                    Store in the main database without creating a list
                  </div>
                </button>
              </div>

              {listMode === "new" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">New List Name *</label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="e.g. Chennai RTO May 2025"
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#050E21] border border-white/15 focus:outline-none focus:border-[#C9A84C] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Assign to Staff Member (Optional)</label>
                    <select
                      value={assignedAdminUserId}
                      onChange={(e) => setAssignedAdminUserId(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-[#050E21] border border-white/15 focus:outline-none focus:border-[#C9A84C] text-white"
                    >
                      <option value="">— Unassigned (super-admin only) —</option>
                      {assignableAdmins.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.employees?.name ? `${u.employees.name} (${u.email})` : u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {listMode === "existing" && (
                <div className="pt-2">
                  <label className="text-xs text-white/60 mb-1 block">Select Existing List *</label>
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs bg-[#050E21] border border-white/15 focus:outline-none focus:border-[#C9A84C] text-white"
                  >
                    <option value="">— Select list —</option>
                    {existingLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.lead_count ?? 0} leads)
                        {l.assigned_admin_user?.name ? ` · ${l.assigned_admin_user.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Duplicate Strategy & Default Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-white/10">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-2">
                  Duplicate Handling
                </label>
                <div className="space-y-2">
                  {[
                    { id: "skip", label: "Skip existing leads (Recommended)", desc: "Matches phone number; avoids creating duplicates" },
                    { id: "update", label: "Update existing leads", desc: "Overwrites vehicle and address info with new spreadsheet values" },
                    { id: "allow", label: "Allow duplicates", desc: "Always creates a new lead row regardless of phone number" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        duplicateStrategy === opt.id
                          ? "border-[#C9A84C]/50 bg-[#C9A84C]/5 text-white"
                          : "border-white/5 text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value={opt.id}
                        checked={duplicateStrategy === opt.id}
                        onChange={() => setDuplicateStrategy(opt.id as "skip" | "update" | "allow")}
                        className="mt-0.5 text-[#C9A84C] focus:ring-0"
                      />
                      <div>
                        <div className="font-semibold text-white">{opt.label}</div>
                        <div className="text-[10px] text-white/40">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-2">
                  Default Lead Status
                </label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as LeadStatus)}
                  className="w-full rounded-lg px-3 py-2 text-xs bg-[#050E21] border border-white/15 focus:outline-none focus:border-[#C9A84C] text-white mb-3"
                >
                  <option value="new">New (Fresh lead to call)</option>
                  <option value="contacted">Contacted</option>
                  <option value="draft">Draft</option>
                </select>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/50 space-y-1">
                  <div className="font-semibold text-white/70">What happens on import:</div>
                  <div>• AES-256-GCM encryption is applied to phone, car #, and address.</div>
                  <div>• Pincodes automatically derive Chennai localities (e.g. Velachery, Guindy).</div>
                  <div>• Audit log entry will record the import batch.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={isPending}
              type="button"
              className="px-4 py-2 rounded-xl border border-white/10 text-xs text-white/70 hover:bg-white/5 hover:text-white inline-flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back to Mapping
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isPending}
              type="button"
              className="px-8 py-3 rounded-xl bg-[#C9A84C] text-sm font-bold text-[#050E21] hover:bg-[#E8CC7A] disabled:opacity-50 transition-all inline-flex items-center gap-2 shadow-lg shadow-[#C9A84C]/20"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing {stats.valid} Leads...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  Start Import ({stats.valid} Leads)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RESULT / SUCCESS SCREEN */}
      {step === 4 && importResult && (
        <div className="rounded-2xl border border-white/10 bg-[#0B172E] p-8 text-center space-y-6">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-400">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
              Import Completed Successfully!
            </h2>
            <p className="text-xs text-white/50">
              Your leads have been encrypted, verified, and saved to the database.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold text-white">{importResult.total}</div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">Processed</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">+{importResult.inserted}</div>
              <div className="text-[11px] text-emerald-400/70 uppercase tracking-wider">New Leads</div>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-sky-400">{importResult.updated}</div>
              <div className="text-[11px] text-sky-400/70 uppercase tracking-wider">Updated</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{importResult.skipped}</div>
              <div className="text-[11px] text-amber-400/70 uppercase tracking-wider">Duplicates Skipped</div>
            </div>
          </div>

          {importResult.listName && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-1.5 text-xs text-[#E8CC7A]">
              <ListPlus size={14} />
              <span>Assigned to Lead List: <strong>{importResult.listName}</strong></span>
            </div>
          )}

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300 text-left max-w-xl mx-auto space-y-1">
              <div className="font-semibold text-amber-400">Import Notes / Warnings:</div>
              {importResult.errors.map((e, idx) => (
                <div key={idx}>• {e}</div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
            <Link
              href={importResult.listId ? `/admin/lists/${importResult.listId}` : "/admin"}
              className="px-6 py-2.5 rounded-xl bg-[#C9A84C] text-xs font-semibold text-[#050E21] hover:bg-[#E8CC7A] transition-all"
            >
              {importResult.listId ? "View Lead List" : "View All Leads"}
            </Link>
            <button
              onClick={resetAll}
              className="px-4 py-2.5 rounded-xl border border-white/15 text-xs text-white hover:bg-white/5 transition-all"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
