import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  demoTopAuthorities,
  demoTopWinners,
  demoUpcomingProcurements,
  isDemoUser,
} from "@/lib/demo";
import { generateMarketSummary } from "@/lib/ai/market-summary";
import { getMarketOverview } from "@/lib/market-intelligence";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { CategoryChart } from "@/components/intelligence/category-chart";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Trophy,
  TrendingUp,
} from "lucide-react";
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

  const isDemoAccount = isDemoUser(user.email);
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const now = new Date();
  const marketOverview = await getMarketOverview(supabase);
  const displayCategoryData = marketOverview.categoryData.length > 0
    ? marketOverview.categoryData
    : isDemoAccount
      ? [
          { category: "Robe", count: 8, total_value: 420000 },
          { category: "Usluge", count: 5, total_value: 275000 },
          { category: "Softver", count: 3, total_value: 180000 },
        ]
      : [];
  const displayTopAuthorities = marketOverview.topAuthorities.length > 0
    ? marketOverview.topAuthorities
    : isDemoAccount
      ? demoTopAuthorities.map((authority) => ({
          ...authority,
          total_value: 0,
          city: null,
          authority_type: null,
        }))
      : [];
  const displayTopWinners = marketOverview.topWinners.length > 0
    ? marketOverview.topWinners
    : isDemoAccount
      ? demoTopWinners.map((winner) => ({
          ...winner,
          win_rate: null,
          total_bids: null,
          city: null,
          municipality: null,
        }))
      : [];
  const displayUpcomingPlans = marketOverview.upcomingPlans.length > 0
    ? marketOverview.upcomingPlans
    : isDemoAccount
      ? demoUpcomingProcurements.slice(0, 4)
      : [];
  const usingAnyDemoFallback =
    (displayCategoryData.length === 0 && isDemoAccount) ||
    (marketOverview.topAuthorities.length === 0 && displayTopAuthorities.length > 0) ||
    (marketOverview.topWinners.length === 0 && displayTopWinners.length > 0) ||
    (marketOverview.upcomingPlans.length === 0 && displayUpcomingPlans.length > 0);
  const marketSummary = await generateMarketSummary(marketOverview);

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 items-center rounded-full border border-blue-100 bg-blue-50 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Tržišni uvid
            </span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Gdje je tržišna prednost
          </h1>
          <p className="mt-1.5 max-w-3xl text-base text-slate-500">
            Ovdje vidite gdje ima najviše posla, ko trenutno uzima ugovore i šta dolazi dovoljno rano da se možete pripremiti prije konkurencije.
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${usingAnyDemoFallback ? "border-amber-100 bg-amber-50 text-amber-700" : "border-emerald-100 bg-emerald-50 text-emerald-600"}`}>
            {usingAnyDemoFallback ? "Demo primjer" : "Podaci uživo"}
          </p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sažetak za odluku</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{marketSummary.title}</h2>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${marketSummary.source === "ai" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            {marketSummary.source === "ai" ? "AI uvid" : "Sažetak iz podataka"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {marketSummary.sentences.map((sentence, index) => (
            <div key={`${index}-${sentence.slice(0, 24)}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700">
              {sentence}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Otvorene prilike</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{marketOverview.activeTenderCount}</p>
          <p className="mt-3 text-xs text-slate-500">Tenderi na koje se trenutno još možete prijaviti.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Otvorena vrijednost</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <ArrowUpRight className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{formatKM(marketOverview.activeTenderValue)}</p>
          <p className="mt-3 text-xs text-slate-500">Kolika je procijenjena vrijednost tendera koji su sada otvoreni.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Dodijeljeno ove godine</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{formatKM(marketOverview.yearAwardValue)}</p>
          <p className="mt-3 text-xs text-slate-500">Ukupna vrijednost ugovora u {now.getFullYear()}. godini.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Dolazi 90 dana</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CalendarDays className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{marketOverview.plannedCount90d}</p>
          <p className="mt-3 text-xs text-slate-500">{formatKM(marketOverview.plannedValue90d)} potencijalne vrijednosti za ranije planiranje.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Tržišni pritisak</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <BarChart3 className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{marketOverview.avgBidders90d ?? "—"}</p>
          <p className="mt-3 text-xs text-slate-500">Prosječan broj ponuđača po ugovoru zadnjih 90 dana.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Cjenovni pritisak</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Trophy className="size-5" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{marketOverview.avgDiscount90d !== null ? `${marketOverview.avgDiscount90d}%` : "—"}</p>
          <p className="mt-3 text-xs text-slate-500">Koliko tržište prosječno spušta cijenu zadnjih 90 dana.</p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Raspodjela ugovora po kategorijama</h2>
            <p className="mt-1 text-sm text-slate-500">Pregled vrijednosti i broja ugovora po tipu nabavke za {now.getFullYear()}. godinu.</p>
          </div>
          <div className="hidden sm:block rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
            Vrijednost + broj ugovora
          </div>
        </div>
        <div className="h-[350px] w-full">
          <CategoryChart data={displayCategoryData} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="font-heading text-lg font-bold text-slate-900">Kako se nabavke vode</h2>
            <p className="mt-1 text-xs text-slate-500">Najveći tipovi postupka po vrijednosti i tržišnom pritisku.</p>
          </div>
          <div className="mt-5 space-y-3">
            {marketOverview.procedureData.length > 0 ? (
              marketOverview.procedureData.map((procedure) => (
                <div key={procedure.procedure_type} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{procedure.procedure_type}</p>
                      <p className="mt-1 text-xs text-slate-500">{procedure.count} ugovora · {procedure.avg_bidders ?? "—"} ponuđača · {procedure.avg_discount !== null ? `${procedure.avg_discount}% popust` : "bez popusta"}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{formatKM(procedure.total_value)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                Nema dovoljno stvarnih podataka za pregled postupaka.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="font-heading text-lg font-bold text-slate-900">Trend zadnjih mjeseci</h2>
            <p className="mt-1 text-xs text-slate-500">Broj i vrijednost dodijeljenih ugovora po mjesecu.</p>
          </div>
          <div className="mt-5 space-y-3">
            {marketOverview.monthlyAwards.length > 0 ? (
              marketOverview.monthlyAwards.map((month) => (
                <div key={month.month_key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{month.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{month.count} ugovora</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">{formatKM(month.total_value)}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                Nema dovoljno podataka za trend po mjesecima.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/30 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Building2 className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji naručioci</h2>
                <p className="text-xs font-medium text-slate-500">Po broju tendera i procijenjenoj vrijednosti u ovom mjesecu.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-2">
            {displayTopAuthorities.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-400">Nema dovoljno podataka za ovaj mjesec.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {displayTopAuthorities.map((authority, index) => (
                  <div key={`${authority.name}-${index}`} className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        {authority.jib ? (
                          <Link href={`/dashboard/intelligence/authority/${authority.jib}`} className="truncate text-sm font-bold text-slate-700 transition-colors group-hover:text-primary">
                            {authority.name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-bold text-slate-700">{authority.name}</span>
                        )}
                        <p className="text-xs text-slate-500">{[authority.city, authority.authority_type].filter(Boolean).join(" · ") || "Javni naručilac"}</p>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900">{authority.count}</p>
                      <p className="text-xs text-slate-400">{formatKM(authority.total_value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/30 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Trophy className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Najuspješniji ponuđači</h2>
                <p className="text-xs font-medium text-slate-500">Po ukupnoj vrijednosti ugovora ove godine.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-2">
            {displayTopWinners.length === 0 ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-400">Nema dovoljno podataka za ovu godinu.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {displayTopWinners.map((winner, index) => (
                  <div key={winner.jib} className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-600">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-700 transition-colors group-hover:text-primary">{winner.name}</p>
                        <p className="text-xs text-slate-500">{winner.wins} ugovora · {winner.win_rate !== null ? `${winner.win_rate}% uspješnost` : "bez podatka"}</p>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-bold text-emerald-600">{formatKM(winner.total_value)}</p>
                      <p className="text-xs text-slate-400">{winner.total_bids !== null ? `${winner.total_bids} ponuda` : winner.city || winner.municipality || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Šta dolazi uskoro</h2>
            <p className="mt-1 text-xs text-slate-500">Planirane nabavke u narednih 90 dana.</p>
          </div>
          <CalendarDays className="size-5 text-violet-600" />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {displayUpcomingPlans.length > 0 ? (
            displayUpcomingPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{plan.description || "Bez opisa"}</p>
                <p className="mt-1 text-xs text-slate-500">{plan.contracting_authorities?.name ?? "Nepoznat naručilac"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium">
                    {plan.planned_date ? new Date(plan.planned_date).toLocaleDateString("bs-BA") : "—"}
                  </span>
                  {plan.contract_type ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                      {plan.contract_type}
                    </span>
                  ) : null}
                  {plan.estimated_value ? (
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                      {formatKM(plan.estimated_value)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500 lg:col-span-2">
              Trenutno nema planiranih nabavki za prikaz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
