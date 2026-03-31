import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { TrendingUp, Calendar, MapPin, Building2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function NoviTenderiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (!isSubscribed) return <ProGate />;

  // Fetch latest tenders from EJN (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, portal_id, title, contracting_authority, deadline, estimated_value, ai_analysis, created_at, status")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  const formatValue = (v: number | null) => {
    if (!v) return null;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M KM`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K KM`;
    return `${v} KM`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { label: date.toLocaleDateString("bs-BA", { day: "numeric", month: "short" }), daysLeft };
  };

  const formatRelative = (d: string) => {
    const diffMs = Date.now() - new Date(d).getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffH < 1) return "Upravo dodano";
    if (diffH < 24) return `Prije ${diffH}h`;
    if (diffD === 1) return "Jučer";
    return `Prije ${diffD} dana`;
  };

  const getTenderArea = (ai_analysis: unknown): string | null => {
    if (!ai_analysis || typeof ai_analysis !== "object") return null;
    const a = ai_analysis as Record<string, unknown>;
    return (a.area_label as string) ?? (a.canton as string) ?? (a.municipality as string) ?? null;
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          Novi tenderi
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Tenderi objavljeni u zadnjih 7 dana na portalu javnih nabavki BiH.
        </p>
      </div>

      {(tenders ?? []).length > 0 ? (
        <div className="space-y-3">
          {(tenders ?? []).map((t) => {
              const deadline = formatDate(t.deadline as string | null);
              const area = getTenderArea(t.ai_analysis);
              return (
              <Link
                key={t.id}
                href={`/dashboard/tenders/${t.id}`}
                className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {formatRelative(t.created_at as string)}
                    </span>
                    {area && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="size-3" />
                        {area}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {t.title as string}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {t.contracting_authority && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3 shrink-0" />
                        {t.contracting_authority as string}
                      </span>
                    )}
                    {deadline && (
                      <span className={`flex items-center gap-1 ${deadline.daysLeft <= 7 ? "text-red-600 font-semibold" : ""}`}>
                        <Calendar className="size-3 shrink-0" />
                        Rok: {deadline.label}
                        {deadline.daysLeft > 0 && ` (${deadline.daysLeft}d)`}
                      </span>
                    )}
                    {t.estimated_value && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <TrendingUp className="size-3 shrink-0" />
                        {formatValue(t.estimated_value as number)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
              </Link>
              );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <TrendingUp className="size-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nema novih tendera u zadnjih 7 dana.</p>
          <p className="text-xs text-slate-400 mt-1">Tenderi se ažuriraju svake noći oko 02:00.</p>
        </div>
      )}
    </div>
  );
}
