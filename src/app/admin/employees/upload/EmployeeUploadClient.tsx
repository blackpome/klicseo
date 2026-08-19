"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBackButton from "@/components/AdminBackButton";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  UserPlus,
  ShieldCheck,
  Download,
  Info,
  Loader2,
  Table as TableIcon,
  Check,
  Users,
} from "lucide-react";
import {
  parseEmployeeSpreadsheetBuffer,
  autoDetectEmployeeMapping,
  normalizeEmployeeRowsWithMapping,
  CANONICAL_EMPLOYEE_FIELDS,
  generateEmployeeSampleCsv,
  type ParsedEmployeeSpreadsheet,
  type EmployeeColumnMapping,
  type NormalizedEmployeeImportRow,
} from "@/lib/employee-import-parser";
import { formatPhone } from "@/lib/phone-shared";
import { bulkImportEmployeesAction, type BulkImportEmployeesActionResult } from "../actions";
import type { EmployeeStatus } from "@/lib/employees-shared";

interface Props {
  adminUsers: { id: string; email: string; name?: string | null }[];
  availableJobs: { slug: string; title: string }[];
}

type WizardStep = "upload" | "map" | "preview" | "importing" | "result";

export default function EmployeeUploadClient({ adminUsers, availableJobs }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedEmployeeSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<EmployeeColumnMapping>({});

  // Configuration options
  const [defaultJobRole, setDefaultJobRole] = useState<string>(
    availableJobs[0]?.slug ?? "car-cleaner",
  );
  const [defaultStatus, setDefaultStatus] = useState<EmployeeStatus>("active");
  const [assignedAdminUserId, setAssignedAdminUserId] = useState<string>("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "allow">("skip");

  // Import state
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<BulkImportEmployeesActionResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse file when selected
  const handleFileSelect = async (selectedFile: File) => {
    setParseError(null);
    setFile(selectedFile);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const parsedData = parseEmployeeSpreadsheetBuffer(buffer);
      setParsed(parsedData);
      const initialMapping = autoDetectEmployeeMapping(parsedData.headers);
      setMapping(initialMapping);
      setStep("map");
    } catch (err: unknown) {
      console.error("Spreadsheet parsing failed:", err);
      setParseError(
        err instanceof Error ? err.message : "Failed to parse spreadsheet file.",
      );
    }
  };

  // Change active sheet if multi-sheet Excel
  const handleSheetChange = async (sheetName: string) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsedData = parseEmployeeSpreadsheetBuffer(buffer, sheetName);
      setParsed(parsedData);
      const newMapping = autoDetectEmployeeMapping(parsedData.headers);
      setMapping(newMapping);
    } catch (err: unknown) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse selected sheet.",
      );
    }
  };

  // Normalized preview rows
  const normalizedRows: NormalizedEmployeeImportRow[] = useMemo(() => {
    if (!parsed) return [];
    return normalizeEmployeeRowsWithMapping(parsed.rows, mapping, {
      defaultStatus,
      defaultJobRole,
      sourceFileName: file?.name,
    });
  }, [parsed, mapping, defaultStatus, defaultJobRole, file?.name]);

  // Validation counts
  const validRows = useMemo(
    () => normalizedRows.filter((r) => r.isValid),
    [normalizedRows],
  );
  const invalidRows = useMemo(
    () => normalizedRows.filter((r) => !r.isValid),
    [normalizedRows],
  );

  // Execute bulk import
  const handleExecuteImport = () => {
    if (validRows.length === 0) return;

    setStep("importing");
    startTransition(async () => {
      try {
        const payload = {
          employees: validRows.map((r) => ({
            name: r.name,
            phone: r.phone,
            job_role: r.job_role,
            status: r.status,
            location: r.location,
            salary: r.salary,
            joining_date: r.joining_date,
            aadhaar_number: r.aadhaar_number,
            notes: r.notes,
          })),
          defaultStatus,
          defaultJobRole,
          assignedAdminUserId: assignedAdminUserId || null,
          duplicateStrategy,
          sourceFileName: file?.name,
        };

        const res = await bulkImportEmployeesAction(payload);
        setImportResult(res);
        setStep("result");
      } catch (err: unknown) {
        console.error("Bulk import failed:", err);
        setImportResult({
          ok: false,
          insertedCount: 0,
          duplicateCount: 0,
          skippedCount: 0,
          error: err instanceof Error ? err.message : "Bulk import execution failed.",
        });
        setStep("result");
      }
    });
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const csvContent = generateEmployeeSampleCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "klicseo_employees_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetWizard = () => {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setMapping({});
    setImportResult(null);
    setParseError(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <AdminBackButton
              fallbackHref="/admin/employees"
              label="Back to Employees"
              className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1 transition-colors"
            />
          </div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Import Employees
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Bulk upload cleaner, supervisor, and staff rosters via Excel (.xlsx, .xls) or CSV.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-[#C9A84C]/40 text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-sm"
        >
          <Download size={14} className="text-[#C9A84C]" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Multi-Step Breadcrumb Progress */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[#071228] border border-white/[0.08] overflow-x-auto text-xs font-semibold">
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            step === "upload"
              ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
              : "text-white/40"
          }`}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">
            1
          </span>
          <span>Upload File</span>
        </div>

        <ArrowRight size={13} className="text-white/20 shrink-0" />

        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            step === "map"
              ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
              : "text-white/40"
          }`}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">
            2
          </span>
          <span>Map Columns</span>
        </div>

        <ArrowRight size={13} className="text-white/20 shrink-0" />

        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            step === "preview"
              ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
              : "text-white/40"
          }`}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">
            3
          </span>
          <span>Validate & Preview</span>
        </div>

        <ArrowRight size={13} className="text-white/20 shrink-0" />

        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
            step === "importing" || step === "result"
              ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
              : "text-white/40"
          }`}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[10px]">
            4
          </span>
          <span>Complete</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {step === "upload" && (
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
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) handleFileSelect(droppedFile);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-[#C9A84C] bg-[#C9A84C]/5 scale-[1.005]"
                : "border-white/15 bg-[#071228] hover:border-white/30 hover:bg-white/[0.01]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
              className="hidden"
            />

            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#E8CC7A]/5 text-[#C9A84C] border border-[#C9A84C]/30 shadow-lg mb-4">
              <UploadCloud size={32} />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Choose or drag & drop employee roster file
            </h3>
            <p className="text-xs text-white/45 max-w-md mx-auto mb-4">
              Supports Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) and{" "}
              <strong>.csv</strong> spreadsheets.
            </p>

            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C9A84C] text-[#050E21] font-bold text-xs shadow-md shadow-[#C9A84C]/20">
              <FileSpreadsheet size={14} /> Browse Computer
            </span>
          </div>

          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <XCircle size={16} className="shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Guidelines Box */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#071228] p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Info size={14} className="text-[#C9A84C]" />
              <span>Recommended Spreadsheet Columns</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white">Full Name *</div>
                <div className="text-[11px] text-white/40">e.g. Ramesh Kumar</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white">Mobile Number *</div>
                <div className="text-[11px] text-white/40">10-digit Indian number</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white">Job Role</div>
                <div className="text-[11px] text-white/40">Cleaner, Supervisor, etc.</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white">Monthly Salary</div>
                <div className="text-[11px] text-white/40">e.g. 18000, 24000</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white">Location / Area</div>
                <div className="text-[11px] text-white/40">e.g. Velachery, Guindy</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-semibold text-white">Date of Joining</div>
                <div className="text-[11px] text-white/40">YYYY-MM-DD or DD/MM/YYYY</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: MAP COLUMNS & CONFIGURE */}
      {step === "map" && parsed && (
        <div className="space-y-6">
          {/* File summary pill */}
          <div className="p-4 rounded-2xl bg-[#071228] border border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div className="font-bold text-sm text-white">{file?.name}</div>
                <div className="text-[11px] text-white/40">
                  {parsed.totalRows} rows found · {parsed.headers.length} columns
                </div>
              </div>
            </div>

            {parsed.sheetNames.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-white/40">Sheet:</span>
                <select
                  value={parsed.selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-[#050E21] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  {parsed.sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Import Defaults Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#071228] p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-white/[0.06] pb-3">
              <Users size={14} className="text-[#C9A84C]" />
              <span>Import Defaults & Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Default Job Role */}
              <div className="space-y-1.5">
                <label className="text-white/60 font-medium">Default Job Role</label>
                <select
                  value={defaultJobRole}
                  onChange={(e) => setDefaultJobRole(e.target.value)}
                  className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C9A84C]"
                >
                  {availableJobs.map((j) => (
                    <option key={j.slug} value={j.slug}>
                      {j.title}
                    </option>
                  ))}
                  <option value="car-cleaner">Car Cleaner</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="telecaller">Telecaller</option>
                  <option value="driver">Driver</option>
                </select>
              </div>

              {/* Default Status */}
              <div className="space-y-1.5">
                <label className="text-white/60 font-medium">Default Status</label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as EmployeeStatus)}
                  className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C9A84C]"
                >
                  <option value="active">Active (Employed)</option>
                  <option value="hired">Hired (Pre-joining)</option>
                  <option value="screening">Screening</option>
                  <option value="applied">Applied</option>
                </select>
              </div>

              {/* Assigned Admin / Supervisor */}
              <div className="space-y-1.5">
                <label className="text-white/60 font-medium">Assign to Supervisor</label>
                <select
                  value={assignedAdminUserId}
                  onChange={(e) => setAssignedAdminUserId(e.target.value)}
                  className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C9A84C]"
                >
                  <option value="">— Unassigned —</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duplicate Strategy */}
              <div className="space-y-1.5">
                <label className="text-white/60 font-medium">Existing Mobile Numbers</label>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value as "skip" | "allow")}
                  className="w-full bg-[#050E21] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C9A84C]"
                >
                  <option value="skip">Skip duplicates (Recommended)</option>
                  <option value="allow">Allow duplicate entries</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mapping Grid */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#071228] p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Column Mapping</h3>
                <p className="text-xs text-white/40">
                  Match your spreadsheet columns to Klicseo employee fields.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CANONICAL_EMPLOYEE_FIELDS.map((field) => {
                const selectedHeader = mapping[field.key] || "";
                const isAutoMatched = Boolean(selectedHeader);

                return (
                  <div
                    key={field.key}
                    className="p-3.5 rounded-xl bg-[#050E21] border border-white/[0.06] space-y-2 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="text-rose-400 font-bold text-xs" title="Required field">
                            *
                          </span>
                        )}
                      </div>

                      {isAutoMatched && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check size={10} /> Auto-matched
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-white/40">{field.description}</p>

                    <select
                      value={selectedHeader}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMapping((prev) => ({
                          ...prev,
                          [field.key]: val,
                        }));
                      }}
                      className="w-full bg-[#071228] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]"
                    >
                      <option value="">— Not Mapped (Ignore) —</option>
                      {parsed.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetWizard}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw size={13} /> Upload Different File
            </button>

            <button
              type="button"
              disabled={!mapping.name || !mapping.phone}
              onClick={() => setStep("preview")}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all inline-flex items-center gap-2 shadow-md shadow-[#C9A84C]/20 disabled:opacity-50"
            >
              <span>Preview & Validate</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATE */}
      {step === "preview" && parsed && (
        <div className="space-y-6">
          {/* Validation Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#071228] border border-white/[0.08]">
              <div className="text-white/40 text-[11px] font-semibold uppercase">
                Total Rows
              </div>
              <div className="text-2xl font-bold text-white mt-1 tabular-nums">
                {normalizedRows.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-emerald-300 text-[11px] font-semibold uppercase flex items-center gap-1">
                <CheckCircle2 size={13} /> Valid Employees
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
                {validRows.length}
              </div>
              <div className="text-[10px] text-emerald-400/60 mt-0.5">
                Ready for database insertion
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30">
              <div className="text-rose-300 text-[11px] font-semibold uppercase flex items-center gap-1">
                <XCircle size={13} /> Invalid Rows
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">
                {invalidRows.length}
              </div>
              <div className="text-[10px] text-rose-400/60 mt-0.5">
                Missing name or phone number
              </div>
            </div>
          </div>

          {/* 10-Row Preview Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#071228] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TableIcon size={15} className="text-[#C9A84C]" />
                <h3 className="text-xs font-bold text-white">
                  Data Preview (Showing first 10 rows)
                </h3>
              </div>
              <span className="text-[11px] text-white/40">
                {validRows.length} valid / {normalizedRows.length} total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-white/40 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Salary</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Joining Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {normalizedRows.slice(0, 10).map((r, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
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
                      <td className="py-2.5 px-3 font-medium text-white max-w-[150px] truncate">
                        {r.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#E8CC7A]">
                        {r.phone ? formatPhone(r.phone) : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80 text-[11px]">
                          {r.job_role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">
                        {r.salary != null ? `₹${r.salary.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-white/60 max-w-[150px] truncate">
                        {r.location || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-white/50 font-mono">
                        {r.joining_date || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep("map")}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={13} /> Back to Mapping
            </button>

            <button
              type="button"
              disabled={validRows.length === 0 || isPending}
              onClick={handleExecuteImport}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all inline-flex items-center gap-2 shadow-md shadow-[#C9A84C]/20 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Importing {validRows.length} Employees…</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Import {validRows.length} Employees</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING LOADER */}
      {step === "importing" && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#071228] p-16 text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 animate-pulse">
            <Loader2 size={32} className="animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-white">Importing Employees…</h2>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            Encrypting sensitive records, hashing contact numbers, and inserting into database.
          </p>
        </div>
      )}

      {/* STEP 5: RESULT / SUCCESS */}
      {step === "result" && importResult && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#071228] p-10 text-center space-y-6">
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border ${
              importResult.ok
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
            }`}
          >
            {importResult.ok ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">
              {importResult.ok ? "Import Completed Successfully" : "Import Completed with Issues"}
            </h2>
            <p className="text-xs text-white/50 max-w-md mx-auto">
              {importResult.insertedCount} employee records successfully saved to Klicseo database.
            </p>
          </div>

          {/* Results Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-xs">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-white/40 text-[10px] uppercase font-semibold">Inserted</div>
              <div className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">
                {importResult.insertedCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-white/40 text-[10px] uppercase font-semibold">Duplicates Skipped</div>
              <div className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">
                {importResult.duplicateCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-white/40 text-[10px] uppercase font-semibold">Total Processed</div>
              <div className="text-xl font-bold text-white tabular-nums mt-0.5">
                {importResult.insertedCount + importResult.duplicateCount}
              </div>
            </div>
          </div>

          {importResult.error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs max-w-lg mx-auto text-left">
              {importResult.error}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={resetWizard}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 transition-colors"
            >
              Upload Another Roster
            </button>

            <Link
              href="/admin/employees"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#E8CC7A] text-[#050E21] text-xs font-bold hover:brightness-105 transition-all shadow-md shadow-[#C9A84C]/20 inline-flex items-center gap-1.5"
            >
              <Users size={14} />
              <span>View All Employees</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
