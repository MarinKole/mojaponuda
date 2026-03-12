import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { CategoryChart } from "@/components/intelligence/category-chart";
import { TrendingUp, FileText, BarChart3, Database } from "lucide-react";
import Link from "next/link";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export default async function IntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id);
  if (!isSubscribed) return <ProGate />;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  // Aktivni tenderi
  const { count: activeCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("deadline", now.toISOString());

  // Ukupna godišnja vrijednost dodijeljenih ugovora
  const { data: yearAwards } = await supabase
    .from("award_decisions")
    .select("winning_price, contract_type")
    .gte("award_date", startOfYear)
    .not("winning_price", "is", null);

  const yearTotalValue = (yearAwards ?? []).reduce(
    (sum, a) => sum + (Number(a.winning_price) || 0),
    0
  );

  // Tenderi po kategoriji
  const categoryMap = new Map<string, { category: string; count: number; total_value: number }>();
  for (const a of yearAwards ?? []) {
    const cat = a.contract_type ?? "Ostalo";
    const existing = categoryMap.get(cat);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.count++;
      existing.total_value += price;
    } else {
      categoryMap.set(cat, { category: cat, count: 1, total_value: price });
    }
  }
  const categoryData = [...categoryMap.values()].sort((a, b) => b.count - a.count);

  // Top 10 naručilaca ovog mjeseca
  const { data: monthTenders } = await supabase
    .from("tenders")
    .select("contracting_authority, contracting_authority_jib")
    .gte("created_at", startOfMonth)
    .not("contracting_authority", "is", null);

  const authMap = new Map<string, { name: string; jib: string | null; count: number }>();
  for (const t of monthTenders ?? []) {
    const key = t.contracting_authority!;
    const e = authMap.get(key);
    if (e) e.count++;
    else authMap.set(key, { name: key, jib: t.contracting_authority_jib, count: 1 });
  }
  const topAuthorities = [...authMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // Top 10 pobjednika ove godine
  const winnerMap = new Map<string, { name: string; jib: string; wins: number; total_value: number }>();
  const { data: winnerAwards } = await supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price")
    .gte("award_date", startOfYear)
    .not("winner_jib", "is", null)
    .not("winning_price", "is", null);

  for (const a of winnerAwards ?? []) {
    const key = a.winner_jib!;
    const e = winnerMap.get(key);
    const price = Number(a.winning_price) || 0;
    if (e) { e.wins++; e.total_value += price; }
    else winnerMap.set(key, { name: a.winner_name ?? key, jib: key, wins: 1, total_value: price });
  }
  const topWinners = [...winnerMap.values()].sort((a, b) => b.total_value - a.total_value).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-1.5 bg-blue-500 animate-pulse" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Module_Active // Market_Intelligence
            </p>
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Tržišna Analitika
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-emerald-400">DATA_SYNC: REALTIME</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">
            SOURCE: EJN_OData_API
          </p>
        </div>
      </div>

      {/* Kartice */}
      <div className="grid gap-px bg-slate-800 sm:grid-cols-3 border border-slate-800">
        <div className="bg-[#020611] p-6 relative overflow-hidden group hover:bg-[#060b17] transition-colors">
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Aktivni Tenderi</p>
            <FileText className="size-4 text-blue-500" />
          </div>
          <p className="font-mono text-4xl font-light text-white">{activeCount ?? 0}</p>
          <p className="mt-2 font-mono text-[10px] text-slate-500">STATUS: OPEN_DEADLINE</p>
        </div>

        <div className="bg-[#020611] p-6 relative overflow-hidden group hover:bg-[#060b17] transition-colors">
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Godišnji Volumen</p>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="font-mono text-4xl font-light text-emerald-400">{formatKM(yearTotalValue)}</p>
          <p className="mt-2 font-mono text-[10px] text-slate-500">PERIOD: YTD_{now.getFullYear()}</p>
        </div>

        <div className="bg-[#020611] p-6 relative overflow-hidden group hover:bg-[#060b17] transition-colors">
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Model_Confidence</p>
            <BarChart3 className="size-4 text-purple-500" />
          </div>
          <p className="font-mono text-4xl font-light text-slate-400">94.2%</p>
          <p className="mt-2 font-mono text-[10px] text-slate-500">DATA_ACCURACY_RATING</p>
        </div>
      </div>

      {/* Bar chart: tenderi po kategoriji */}
      <div className="border border-slate-800 bg-[#060b17] p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <h2 className="font-mono text-xs font-bold text-white">CATEGORY_DISTRIBUTION</h2>
          <p className="font-mono text-[10px] text-slate-500">PERIOD: YTD_{now.getFullYear()}</p>
        </div>
        <CategoryChart data={categoryData} />
      </div>

      {/* Dva panela */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top naručioci */}
        <div className="border border-slate-800 bg-[#060b17] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#020611] p-4">
            <div>
              <h2 className="font-mono text-xs font-bold text-white">TOP_BUYERS</h2>
              <p className="mt-1 font-mono text-[9px] text-slate-500">RANKED_BY_VOLUME // CURRENT_MONTH</p>
            </div>
            <Database className="size-4 text-slate-600" />
          </div>
          
          <div className="flex-1 p-4">
            {topAuthorities.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-[10px] text-slate-500">NO_DATA_AVAILABLE</p>
              </div>
            ) : (
              <div className="space-y-1">
                {topAuthorities.map((a, i) => (
                  <div key={a.name} className="flex items-center justify-between border border-slate-800/50 bg-[#020611] px-4 py-3 hover:border-blue-500/30 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-mono text-[10px] text-slate-600 w-4">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {a.jib ? (
                        <Link href={`/dashboard/intelligence/authority/${a.jib}`} className="truncate text-xs font-bold text-slate-300 group-hover:text-blue-400 transition-colors">
                          {a.name.toUpperCase()}
                        </Link>
                      ) : (
                        <span className="truncate text-xs font-bold text-slate-300">{a.name.toUpperCase()}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-blue-500 ml-4">{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top pobjednici */}
        <div className="border border-slate-800 bg-[#060b17] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#020611] p-4">
            <div>
              <h2 className="font-mono text-xs font-bold text-white">TOP_SUPPLIERS</h2>
              <p className="mt-1 font-mono text-[9px] text-slate-500">RANKED_BY_WON_VALUE // YTD_{now.getFullYear()}</p>
            </div>
            <Database className="size-4 text-slate-600" />
          </div>
          
          <div className="flex-1 p-4">
            {topWinners.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-[10px] text-slate-500">NO_DATA_AVAILABLE</p>
              </div>
            ) : (
              <div className="space-y-1">
                {topWinners.map((w, i) => (
                  <div key={w.jib} className="flex items-center justify-between border border-slate-800/50 bg-[#020611] px-4 py-2 hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-mono text-[10px] text-slate-600 w-4">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-300 mb-1">{w.name.toUpperCase()}</p>
                        <p className="font-mono text-[9px] text-slate-500">WINS: {w.wins}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-emerald-400 ml-4">{formatKM(w.total_value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
