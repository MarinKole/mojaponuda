"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, TrendingUp, Trophy, X, ThumbsDown, RotateCcw, Loader2 } from "lucide-react";

interface TrackedOpportunity {
  followId: string;
  outcome: "won" | "lost" | null;
  followedAt: string;
  opportunity: {
    id: string;
    slug: string;
    type: string;
    title: string;
    issuer: string;
    deadline: string | null;
    value: number | null;
    location: string | null;
    ai_summary: string | null;
    ai_difficulty: string | null;
  };
}

interface Props {
  follow: TrackedOpportunity;
}

export function TrackedOpportunityCard({ follow: initialFollow }: Props) {
  const [follow, setFollow] = useState(initialFollow);
  const [loading, setLoading] = useState<string | null>(null);

  const o = follow.opportunity;
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

  const setOutcome = async (outcome: "won" | "lost" | null) => {
    setLoading(outcome ?? "reset");
    try {
      const res = await fetch(`/api/opportunities/${o.id}/follow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (res.ok) setFollow((f) => ({ ...f, outcome }));
    } catch {}
    setLoading(null);
  };

  const unfollow = async () => {
    setLoading("unfollow");
    try {
      const res = await fetch(`/api/opportunities/${o.id}/follow`, { method: "DELETE" });
      if (res.ok) setFollow((f) => ({ ...f, outcome: "lost" as const })); // optimistic: hide card
    } catch {}
    setLoading(null);
  };

  const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const outcomeConfig = {
    won: { label: "Dobijeno", bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
    lost: { label: "Izgubljeno", bg: "bg-slate-50 border-slate-200", badge: "bg-slate-100 text-slate-600" },
  };

  const cardBg = follow.outcome
    ? outcomeConfig[follow.outcome].bg
    : isUrgent
    ? "bg-amber-50 border-amber-200"
    : isExpired
    ? "bg-slate-50 border-slate-200"
    : "bg-white border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all ${cardBg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
              {o.type === "poticaj" ? "Poticaj" : "Nabavka"}
            </span>
            {follow.outcome && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${outcomeConfig[follow.outcome].badge}`}>
                {outcomeConfig[follow.outcome].label}
              </span>
            )}
            {!follow.outcome && isUrgent && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                ISTIČE USKORO
              </span>
            )}
            {!follow.outcome && isExpired && (
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
          <p className="text-sm text-slate-500 mt-0.5">{o.issuer}</p>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            {o.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {o.location}
              </span>
            )}
            {o.deadline && (
              <span className={`flex items-center gap-1 font-semibold ${
                isExpired ? "text-red-600" : isUrgent ? "text-amber-600" : "text-slate-600"
              }`}>
                <Calendar className="size-3" />
                {isExpired
                  ? "Rok istekao"
                  : daysLeft !== null && daysLeft > 0
                  ? `${daysLeft} dana`
                  : new Date(o.deadline).toLocaleDateString("bs-BA", { day: "numeric", month: "short" })}
              </span>
            )}
            {o.value && (
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <TrendingUp className="size-3" />
                {formatValue(o.value)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {follow.outcome === null ? (
              <>
                <button
                  onClick={() => setOutcome("won")}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading === "won" ? <Loader2 className="size-3 animate-spin" /> : <Trophy className="size-3" />}
                  Dobijeno
                </button>
                <button
                  onClick={() => setOutcome("lost")}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {loading === "lost" ? <Loader2 className="size-3 animate-spin" /> : <ThumbsDown className="size-3" />}
                  Izgubljeno
                </button>
                <button
                  onClick={unfollow}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {loading === "unfollow" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                  Ukloni
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setOutcome(null)}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {loading === "reset" ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
                  Vrati u praćenje
                </button>
                <button
                  onClick={unfollow}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  {loading === "unfollow" ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                  Ukloni
                </button>
              </>
            )}
          </div>
        </div>

        <Link href={`/prilike/${slug}`} className="shrink-0">
          <span className="text-xs text-blue-600 hover:underline">Otvori →</span>
        </Link>
      </div>
    </div>
  );
}
