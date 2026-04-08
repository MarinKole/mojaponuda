import Link from "next/link";
import type { Tender } from "@/types/database";
import {
  ArrowUpRight,
  Banknote,
  Building2,
  Clock3,
  FileText,
  Lock,
  Users,
} from "lucide-react";

interface TenderCardProps {
  tender: Tender;
  locked?: boolean;
  clientNames?: string[];
  href?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Rok nije objavljen";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "Vrijednost nije objavljena";
  return new Intl.NumberFormat("bs-BA", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " KM";
}

function getDeadlineStatus(deadline: string | null): {
  text: string;
  cardClass: string;
  accentClass: string;
  textClass: string;
} {
  if (!deadline) {
    return {
      text: "Rok nije objavljen",
      cardClass: "border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]",
      accentClass: "bg-slate-500",
      textClass: "text-slate-300",
    };
  }

  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) {
    return {
      text: diffDays <= 0 ? "Rok je danas" : `Još ${diffDays} dana`,
      cardClass: "border-rose-500/40 bg-[linear-gradient(180deg,rgba(64,12,28,0.96)_0%,rgba(24,24,27,0.98)_100%)] shadow-[0_24px_60px_-42px_rgba(244,63,94,0.24)]",
      accentClass: "bg-rose-500",
      textClass: "text-rose-200",
    };
  }

  if (diffDays <= 10) {
    return {
      text: `Još ${diffDays} dana`,
      cardClass: "border-amber-500/35 bg-[linear-gradient(180deg,rgba(69,45,12,0.96)_0%,rgba(24,24,27,0.98)_100%)] shadow-[0_24px_60px_-42px_rgba(245,158,11,0.22)]",
      accentClass: "bg-amber-400",
      textClass: "text-amber-100",
    };
  }

  return {
    text: formatDate(deadline),
    cardClass: "border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]",
    accentClass: "bg-emerald-400",
    textClass: "text-emerald-200",
  };
}

const TYPE_COLORS: Record<string, string> = {
  Robe: "border-sky-500/35 bg-sky-500/16 text-sky-100",
  Usluge: "border-fuchsia-500/35 bg-fuchsia-500/16 text-fuchsia-100",
  Radovi: "border-amber-500/35 bg-amber-500/16 text-amber-100",
};

export function TenderCard({ tender, locked = false, clientNames, href }: TenderCardProps) {
  const deadline = getDeadlineStatus(tender.deadline);
  const typeColor = tender.contract_type
    ? TYPE_COLORS[tender.contract_type] ?? "border-slate-700 bg-slate-800/80 text-slate-200"
    : "border-slate-700 bg-slate-800/80 text-slate-200";
  const resolvedHref = href ?? (locked ? "/dashboard/subscription" : `/dashboard/tenders/${tender.id}`);

  return (
    <Link href={resolvedHref} className="group block">
      <article
        className={`relative overflow-hidden rounded-[1.5rem] border p-5 text-white transition-all hover:-translate-y-0.5 hover:brightness-[1.04] ${deadline.cardClass}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 ${deadline.accentClass}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_34%)] opacity-80" />
        <div className="flex flex-col gap-5 pl-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${typeColor}`}>
                {tender.contract_type ?? "Ostalo"}
              </span>
              {clientNames?.map((name) => (
                <span
                  key={name}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-violet-500/35 bg-violet-500/16 px-2.5 py-1 text-[11px] font-semibold text-violet-100"
                >
                  <Users className="size-3 shrink-0" />
                  <span className="truncate">{name}</span>
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-4">
              <div className="hidden size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-100 sm:flex">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`line-clamp-2 text-lg font-semibold leading-7 sm:text-[1.15rem] ${locked ? "blur-sm select-none" : "text-white"}`}>
                  {locked ? `Tender #${tender.id.slice(0, 4)} - ${tender.contract_type ?? "Javna nabavka"}` : tender.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span className={`inline-flex max-w-full items-center gap-2 ${locked ? "blur-sm select-none" : ""}`}>
                    <Building2 className="size-4 shrink-0 text-slate-500" />
                    <span className="truncate" title={tender.contracting_authority ?? ""}>
                      {locked ? "Javni naručilac" : (tender.contracting_authority ?? "Nepoznat naručilac")}
                    </span>
                  </span>
                  <span className={`inline-flex items-center gap-2 font-medium ${deadline.textClass}`}>
                    <Clock3 className="size-4 shrink-0" />
                    {deadline.text}
                  </span>
                  <span className={`inline-flex items-center gap-2 font-semibold ${locked ? "blur-sm select-none text-slate-400" : "text-emerald-200"}`}>
                    <Banknote className="size-4 shrink-0" />
                    {locked ? "XXX.XXX KM" : formatValue(tender.estimated_value)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-4 lg:min-w-[118px] lg:flex-col lg:items-end lg:justify-start lg:border-l lg:border-t-0 lg:pt-0 lg:pl-5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Otvori detalje
            </span>
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-300 transition-colors group-hover:text-white">
              {locked ? <Lock className="size-4" /> : <ArrowUpRight className="size-4" />}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
