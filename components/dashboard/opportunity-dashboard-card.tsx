"use client";

import Link from "next/link";
import { Calendar, MapPin, TrendingUp, ArrowUpRight } from "lucide-react";
import { FollowButton } from "./opportunity-actions";

interface Props {
  opportunity: {
    id: string;
    slug: string;
    type: string;
    title: string;
    issuer: string;
    category: string | null;
    value: number | null;
    deadline: string | null;
    location: string | null;
    ai_summary: string | null;
    ai_difficulty: string | null;
  };
}

const difficultyColor: Record<string, string> = {
  lako: "text-emerald-700 bg-emerald-50",
  srednje: "text-amber-700 bg-amber-50",
  tesko: "text-red-700 bg-red-50",
};

export function OpportunityDashboardCard({ opportunity: o }: Props) {
  const slug = o.slug.split("/").pop() ?? o.slug;
  const daysLeft = o.deadline
    ? Math.ceil((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const formatValue = (v: number | null) => {
    if (!v) return null;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M KM`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K KM`;
    return `${v} KM`;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              {o.type === "poticaj" ? "Poticaj" : "Nabavka"}
            </span>
            {o.ai_difficulty && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${difficultyColor[o.ai_difficulty] ?? ""}`}>
                {o.ai_difficulty === "lako" ? "Lako" : o.ai_difficulty === "srednje" ? "Srednje" : "Teško"}
              </span>
            )}
            {daysLeft !== null && daysLeft <= 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                ROK ISTEKAO
              </span>
            )}
          </div>
          <Link href={`/prilike/${slug}`} className="group">
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
              {o.title}
            </h3>
          </Link>
          <p className="text-sm text-slate-500 mt-1">{o.issuer}</p>
          {o.ai_summary && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{o.ai_summary}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            {o.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {o.location}
              </span>
            )}
            {o.deadline && (
              <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft <= 0 ? "text-red-600 font-bold" : daysLeft !== null && daysLeft <= 7 ? "text-red-600 font-semibold" : ""}`}>
                <Calendar className="size-3" />
                {daysLeft !== null && daysLeft <= 0 ? "Istekao" : daysLeft !== null && daysLeft > 0 ? `${daysLeft} dana` : "Uskoro"}
              </span>
            )}
            {o.value && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <TrendingUp className="size-3" />
                {formatValue(o.value)}
              </span>
            )}
          </div>

          <div className="mt-4">
            <FollowButton opportunityId={o.id} />
          </div>
        </div>
        <Link href={`/prilike/${slug}`}>
          <ArrowUpRight className="size-4 text-slate-300 hover:text-blue-500 shrink-0 mt-1 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
