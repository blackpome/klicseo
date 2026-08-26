"use client";

import { useRouter } from "next/navigation";

interface AreaFilterSelectProps {
  areaCounts: { area: string; count: number }[];
  currentArea?: string;
  status?: string;
  q?: string;
  service?: string;
  folder?: string;
  view?: string;
}

export default function AreaFilterSelect({
  areaCounts,
  currentArea,
  status = "all",
  q = "",
  service,
  folder,
  view,
}: AreaFilterSelectProps) {
  const router = useRouter();

  const handleChange = (newArea: string) => {
    const params = new URLSearchParams();
    if (folder) params.set("folder", folder);
    if (status && status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    if (service && service !== "all") params.set("service", service);
    if (newArea && newArea !== "all") params.set("area", newArea);
    if (view && view !== "cards") params.set("view", view);
    params.set("page", "1");

    router.push(`/admin?${params.toString()}`);
  };

  return (
    <select
      value={currentArea ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-[#050E21] border border-white/15 text-white/80 rounded-lg px-2.5 py-1 text-[11px] font-medium focus:outline-none focus:border-[#C9A84C] cursor-pointer"
    >
      <option value="">All {areaCounts.length} Captured Areas...</option>
      {areaCounts.map((a) => (
        <option key={a.area} value={a.area}>
          {a.area} ({a.count})
        </option>
      ))}
    </select>
  );
}
