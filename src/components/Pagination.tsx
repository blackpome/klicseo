import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  buildHref: (page: number, pageSize?: number) => string;
}

export default function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  buildHref,
}: PaginationProps) {
  if (totalCount === 0 || totalPages <= 1) {
    if (totalCount > 0) {
      return (
        <div className="flex items-center justify-between text-xs text-white/40 px-2 py-3 border-t border-white/[0.06]">
          <span>
            Showing all <strong className="text-white/70">{totalCount}</strong> leads
          </span>
        </div>
      );
    }
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let leftBound = Math.max(2, page - 1);
      let rightBound = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        leftBound = 2;
        rightBound = 4;
      } else if (page >= totalPages - 2) {
        leftBound = totalPages - 3;
        rightBound = totalPages - 1;
      }

      if (leftBound > 2) {
        pages.push("...");
      }

      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      if (rightBound < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap text-xs px-2 py-4 border-t border-white/[0.06]">
      {/* Left: Range text */}
      <div className="text-white/50">
        Showing <strong className="text-white font-medium">{start}–{end}</strong> of{" "}
        <strong className="text-white font-medium">{totalCount}</strong> leads
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* First Page */}
        <Link
          href={buildHref(1, pageSize)}
          aria-disabled={page === 1}
          tabIndex={page === 1 ? -1 : undefined}
          title="First Page"
          className={`grid h-8 w-8 place-items-center rounded-lg border transition-all ${
            page === 1
              ? "pointer-events-none opacity-30 border-transparent text-white/30"
              : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <ChevronsLeft size={14} />
        </Link>

        {/* Previous Page */}
        <Link
          href={buildHref(page - 1, pageSize)}
          aria-disabled={page === 1}
          tabIndex={page === 1 ? -1 : undefined}
          title="Previous Page"
          className={`grid h-8 w-8 place-items-center rounded-lg border transition-all ${
            page === 1
              ? "pointer-events-none opacity-30 border-transparent text-white/30"
              : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <ChevronLeft size={14} />
        </Link>

        {/* Number buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-white/30 font-bold">
                  …
                </span>
              );
            }

            const active = p === page;
            return (
              <Link
                key={p}
                href={buildHref(p, pageSize)}
                className={`grid h-8 min-w-[32px] px-2 place-items-center rounded-lg font-semibold text-xs transition-all ${
                  active
                    ? "bg-[#C9A84C] text-[#050E21] shadow-sm font-bold"
                    : "border border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>

        {/* Next Page */}
        <Link
          href={buildHref(page + 1, pageSize)}
          aria-disabled={page === totalPages}
          tabIndex={page === totalPages ? -1 : undefined}
          title="Next Page"
          className={`grid h-8 w-8 place-items-center rounded-lg border transition-all ${
            page === totalPages
              ? "pointer-events-none opacity-30 border-transparent text-white/30"
              : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <ChevronRight size={14} />
        </Link>

        {/* Last Page */}
        <Link
          href={buildHref(totalPages, pageSize)}
          aria-disabled={page === totalPages}
          tabIndex={page === totalPages ? -1 : undefined}
          title="Last Page"
          className={`grid h-8 w-8 place-items-center rounded-lg border transition-all ${
            page === totalPages
              ? "pointer-events-none opacity-30 border-transparent text-white/30"
              : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <ChevronsRight size={14} />
        </Link>
      </div>
    </div>
  );
}
