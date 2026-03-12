"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-800 pt-4">
      <div className="font-mono text-[9px] text-slate-500">
        PAGE_INDEX // {currentPage}_{totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-none border-slate-800 bg-[#060b17] font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 size-3" />
          PREV
        </Button>

        <div className="flex items-center justify-center border border-slate-800 bg-[#020611] px-4 py-2 font-mono text-xs text-white">
          {currentPage} <span className="mx-2 text-slate-700">/</span> {totalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-none border-slate-800 bg-[#060b17] font-mono text-[10px] text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          NEXT
          <ChevronRight className="ml-1 size-3" />
        </Button>
      </div>
    </div>
  );
}
