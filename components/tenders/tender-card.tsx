import Link from "next/link";
import type { Tender } from "@/types/database";
import {
  ExternalLink,
  Clock,
  Building2,
  Tag,
  Banknote,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

interface TenderCardProps {
  tender: Tender;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("bs-BA", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " KM";
}

function getDeadlineStatus(deadline: string | null): {
  text: string;
  className: string;
  dotClass: string;
  urgent: boolean;
} {
  if (!deadline)
    return { text: "NO_DEADLINE", className: "text-slate-500", dotClass: "bg-slate-700", urgent: false };

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { text: `EXPIRED`, className: "text-slate-600 line-through", dotClass: "bg-slate-800", urgent: false };
  if (diffDays <= 3)
    return { text: `T-${diffDays}_DAYS`, className: "text-red-500 font-bold", dotClass: "bg-red-500 animate-pulse", urgent: true };
  if (diffDays <= 7)
    return { text: `T-${diffDays}_DAYS`, className: "text-red-400 font-medium", dotClass: "bg-red-500", urgent: true };
  if (diffDays <= 14)
    return { text: formatDate(deadline), className: "text-amber-500", dotClass: "bg-amber-500", urgent: false };
  return { text: formatDate(deadline), className: "text-slate-400", dotClass: "bg-emerald-500", urgent: false };
}

const TYPE_COLORS: Record<string, string> = {
  Robe: "border-cyan-900 bg-cyan-950/30 text-cyan-400",
  Usluge: "border-violet-900 bg-violet-950/30 text-violet-400",
  Radovi: "border-amber-900 bg-amber-950/30 text-amber-400",
};

export function TenderCard({ tender }: TenderCardProps) {
  const deadline = getDeadlineStatus(tender.deadline);
  const typeColor = tender.contract_type
    ? TYPE_COLORS[tender.contract_type] ?? "border-slate-800 bg-slate-900 text-slate-400"
    : null;

  return (
    <Link href={`/dashboard/tenders/${tender.id}`} className="group block">
      <div className="relative border border-slate-800 bg-[#020611] transition-colors hover:border-slate-700 hover:bg-[#060b17]">
        {/* Left accent stripe */}
        <div className={`absolute inset-y-0 left-0 w-0.5 ${deadline.dotClass.replace("animate-pulse", "")}`} />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 pl-6">
          <div className="min-w-0 flex-1 space-y-3">
            {/* Title */}
            <p className="text-sm font-bold leading-relaxed text-slate-200 transition-colors group-hover:text-white">
              {tender.title}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {tender.contracting_authority && (
                <span className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                  <span className="text-slate-600">AUTH //</span>
                  <span className="truncate max-w-[200px]" title={tender.contracting_authority}>
                    {tender.contracting_authority.toUpperCase()}
                  </span>
                </span>
              )}
              <span className={`flex items-center gap-2 font-mono text-[10px] ${deadline.className}`}>
                <span className="text-slate-600">DUE //</span>
                {deadline.text}
              </span>
              {tender.estimated_value !== null && (
                <span className="flex items-center gap-2 font-mono text-[10px] text-emerald-400">
                  <span className="text-slate-600">VAL //</span>
                  {formatValue(tender.estimated_value)}
                </span>
              )}
            </div>
          </div>

          {/* Right side: type badge + arrow */}
          <div className="flex shrink-0 items-center sm:flex-col sm:items-end justify-between gap-3">
            {typeColor && (
              <span className={`border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest ${typeColor}`}>
                {tender.contract_type}
              </span>
            )}
            <div className="hidden sm:flex items-center gap-1 mt-auto text-slate-600 group-hover:text-blue-500 transition-colors">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase">ANALYZE</span>
              <ChevronRight className="size-3" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
