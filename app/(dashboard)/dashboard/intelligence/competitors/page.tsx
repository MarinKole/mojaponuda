import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { demoCompetitors, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getCompetitorAnalysis } from "@/lib/market-intelligence";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import type { Company } from "@/types/database";
import {
  ArrowUpRight,
  Building2,
  Percent,
  Radar,
  Swords,
  Trophy,
  TrendingUp,
} from "lucide-react";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

function formatPercent(value: number | null): string {
  return value !== null ? `${value}%` : "—";
}

export default async function CompetitorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDemoAccount = isDemoUser(user.email);
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;
  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as Company;
  const keywords = resolvedCompany.keywords || [];
  const regions = resolvedCompany.operating_regions || [];
  const competitorAnalysis = await getCompetitorAnalysis(supabase, {
    jib: resolvedCompany.jib,
    industry: resolvedCompany.industry,
    keywords,
    operating_regions: regions,
  });

  let displayCompetitors = competitorAnalysis.competitors;
  let usingDemoFallback = false;

  if (displayCompetitors.length === 0 && isDemoAccount) {
    usingDemoFallback = true;
    displayCompetitors = demoCompetitors.map((competitor, index) => {
      const baseName = competitor.name.split(" ")[0] || "Firma";
      const regionName = regions.length > 0 ? regions[index % regions.length] : "BiH";
      const customCategories = keywords.length > 0
        ? keywords.slice(index % keywords.length, (index % keywords.length) + 2)
        : competitor.categories;
      const finalCategories = customCategories.length > 0 ? customCategories : competitor.categories;

      return {
        name: `${baseName} ${regionName} d.o.o.`,
        jib: competitor.jib,
        wins: competitor.wins,
        total_value: competitor.total_value,
        categories: finalCategories,
        procedure_types: [],
        last_win_date: competitor.last_win_date,
        win_rate: competitor.win_rate,
        total_bids: null,
        total_market_wins: null,
        total_market_value: null,
        city: null,
        municipality: null,
        recent_wins_90d: 0,
        recent_value_90d: 0,
        avg_award_value: competitor.wins > 0 ? Math.round(competitor.total_value / competitor.wins) : null,
        avg_discount: null,
        avg_bidders: null,
        authority_count: 0,
        top_authorities: [],
        category_match_wins: 0,
        authority_match_wins: 0,
        signal_score: competitor.wins,
      };
    });
  }

  const displayTotalWins = usingDemoFallback
    ? displayCompetitors.reduce((sum, competitor) => sum + competitor.wins, 0)
    : competitorAnalysis.totalCompetitorWins;
  const displayTotalValue = usingDemoFallback
    ? displayCompetitors.reduce((sum, competitor) => sum + competitor.total_value, 0)
    : competitorAnalysis.totalCompetitorValue;
  const leadingCompetitor = displayCompetitors[0] ?? null;
  const hottestCompetitor = [...displayCompetitors].sort(
    (a, b) => b.recent_wins_90d - a.recent_wins_90d || b.wins - a.wins
  )[0] ?? null;
  const mostAccurateCompetitor = [...displayCompetitors]
    .filter((competitor) => competitor.win_rate !== null)
    .sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0] ?? null;

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${usingDemoFallback ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {usingDemoFallback ? "Demo primjer" : "Podaci uživo"}
            </span>
            {competitorAnalysis.trackedAwardsCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {competitorAnalysis.trackedAwardsCount} odluka
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-3xl font-heading font-bold text-slate-900 tracking-tight">Ko vam uzima poslove</h1>
          <p className="mt-2 max-w-3xl text-base text-slate-500">
            Pratimo firme koje pobjeđuju u istim kategorijama i kod istih naručilaca gdje se i vi realno pojavljujete.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm lg:max-w-sm">
          <p className="font-semibold text-slate-900">Osnova analize</p>
          <p className="mt-1">
            {competitorAnalysis.matchedCategories.length} kategorija · {competitorAnalysis.matchedAuthorityCount} naručilaca
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {competitorAnalysis.sourceTerms.length > 0
              ? `Profil: ${competitorAnalysis.sourceTerms.slice(0, 4).join(", ")}`
              : "Koristimo historiju vaših pobjeda i javne tržišne odluke."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Direktni rivali</p>
            <Swords className="size-5 text-rose-600" />
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{displayCompetitors.length}</p>
          <p className="mt-2 text-sm text-slate-500">Firmi koje vam izlaze na istom tržištu.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Ukupne pobjede</p>
            <Trophy className="size-5 text-amber-500" />
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{displayTotalWins}</p>
          <p className="mt-2 text-sm text-slate-500">Broj osvojenih ugovora u praćenom prostoru.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Ugovorena vrijednost</p>
            <TrendingUp className="size-5 text-blue-600" />
          </div>
          <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{formatKM(displayTotalValue)}</p>
          <p className="mt-2 text-sm text-slate-500">Vrijednost poslova koje uzima praćena konkurencija.</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Najjači rival</p>
            <Radar className="size-5 text-violet-600" />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-950">{leadingCompetitor?.name ?? "—"}</p>
          <p className="mt-2 text-sm text-slate-500">
            {leadingCompetitor ? `${leadingCompetitor.wins} pobjeda · ${formatKM(leadingCompetitor.total_value)}` : "Nema dovoljno podataka."}
          </p>
        </div>
      </div>

      {displayCompetitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 py-24 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100">
            <Swords className="size-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nema dovoljno podataka</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {keywords.length === 0 && !resolvedCompany.industry
              ? "Dodajte djelatnost ili ključne riječi u profil firme kako bismo pratili vaše tržište i konkurenciju."
              : "Za vaš trenutni profil još nema dovoljno javnih odluka da izdvojimo jasnu konkurenciju."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sažetak</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Ko trenutno vuče poslove ispred vas</h2>
                </div>
                <Swords className="size-5 text-rose-600" />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najjači rival</p>
                  <p className="mt-3 text-sm font-bold text-slate-900">{leadingCompetitor?.name ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {leadingCompetitor ? `${leadingCompetitor.wins} pobjeda · signal ${leadingCompetitor.signal_score}` : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najveća forma 90 dana</p>
                  <p className="mt-3 text-sm font-bold text-slate-900">{hottestCompetitor?.name ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {hottestCompetitor ? `${hottestCompetitor.recent_wins_90d} svježih pobjeda` : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najveća uspješnost</p>
                  <p className="mt-3 text-sm font-bold text-slate-900">{mostAccurateCompetitor?.name ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {mostAccurateCompetitor ? formatPercent(mostAccurateCompetitor.win_rate) : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Naručioci</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Gdje se najviše sudarate</h2>
                </div>
                <Building2 className="size-5 text-blue-600" />
              </div>
              <div className="mt-5 space-y-3">
                {usingDemoFallback ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
                    Ovo je demo pregled. Nakon brisanja test naloga i nove registracije vidjet ćete samo stvarne tržišne naručioce.
                  </div>
                ) : competitorAnalysis.authorities.length > 0 ? (
                  competitorAnalysis.authorities.map((authority) => {
                    const content = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{authority.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {[authority.city, authority.authority_type].filter(Boolean).join(" · ") || "Javni naručilac"}
                            </p>
                          </div>
                          <ArrowUpRight className="size-4 text-slate-300" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2.5 py-1 font-medium">{authority.awards} odluka</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">{authority.unique_winners} pobjednika</span>
                        </div>
                      </>
                    );

                    return authority.jib ? (
                      <Link
                        key={`${authority.jib}-${authority.name}`}
                        href={`/dashboard/intelligence/authority/${authority.jib}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-blue-200 hover:bg-white"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={authority.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        {content}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                    Još nema dovoljno podataka da izdvojimo glavne naručioce na kojima se konkurencija najviše pojavljuje.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Firma</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Signal</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Pobjede</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">90 dana</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Uspješnost</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Vrijednost</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Prosj. ugovor</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Naručioci</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kategorije</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Zadnja pobjeda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayCompetitors.map((competitor, index) => (
                    <tr key={competitor.jib} className="group transition-colors hover:bg-blue-50/30">
                      <td className="px-6 py-4 font-mono font-medium text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <p className="font-bold text-slate-900 transition-colors group-hover:text-blue-700">{competitor.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">ID: {competitor.jib}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {[
                              competitor.city || competitor.municipality,
                              competitor.total_bids !== null ? `${competitor.total_bids} ponuda` : null,
                              competitor.total_market_wins !== null ? `${competitor.total_market_wins} tržišnih pobjeda` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Bez dodatnih tržišnih metrika"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                          {competitor.signal_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono font-bold text-slate-700">
                          <Trophy className="size-3 text-amber-500" />
                          {competitor.wins}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{competitor.recent_wins_90d}</p>
                          <p className="text-[11px] text-slate-400">{formatKM(competitor.recent_value_90d)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${(competitor.win_rate || 0) >= 50 ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}`}>
                          <Percent className="size-3" />
                          {formatPercent(competitor.win_rate)}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {competitor.avg_discount !== null ? `Prosj. popust ${competitor.avg_discount}%` : "Bez popusta"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-blue-600">
                        {formatKM(competitor.total_value)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-mono font-semibold text-slate-700">
                          {competitor.avg_award_value !== null ? formatKM(competitor.avg_award_value) : "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {competitor.avg_bidders !== null ? `${competitor.avg_bidders} ponuđača` : "Bez broja ponuđača"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-600">{competitor.authority_count} naručilaca</p>
                          <div className="flex flex-wrap gap-1.5">
                            {competitor.top_authorities.slice(0, 2).map((authority) => (
                              <span key={authority} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {authority}
                              </span>
                            ))}
                            {competitor.top_authorities.length > 2 ? (
                              <span className="pl-1 text-[10px] text-slate-400">+{competitor.top_authorities.length - 2}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {competitor.categories.slice(0, 3).map((category) => (
                            <span key={category} className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {category}
                            </span>
                          ))}
                          {competitor.categories.length > 3 ? (
                            <span className="pl-1 text-[10px] text-slate-400">+{competitor.categories.length - 3}</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">
                          {competitor.category_match_wins} kategorija · {competitor.authority_match_wins} naručilaca
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
                        {competitor.last_win_date
                          ? new Date(competitor.last_win_date).toLocaleDateString("bs-BA")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
