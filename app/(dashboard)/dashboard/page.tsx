import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  demoBidSummaries,
  demoCompetitors,
  getDemoDocuments,
  isCompanyProfileComplete,
  isDemoUser,
  demoUpcomingProcurements,
} from "@/lib/demo";
import {
  FileText,
  Briefcase,
  Search,
  Award,
  Clock,
  TrendingUp,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  BellRing,
  ShieldCheck,
  BarChart3,
  Swords,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CreditCard,
} from "lucide-react";
import { RecommendedTenders } from "@/components/dashboard/recommended-tenders";
import type { BidStatus, Document as DocType } from "@/types/database";
import { getSubscriptionStatus } from "@/lib/subscription";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  return new Intl.NumberFormat("bs-BA", {
    style: "currency",
    currency: "BAM",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${Math.round(value)} KM`;
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

const STATUS_CONFIG: Record<string, { label: string; colors: string }> = {
  draft: { label: "Nacrt", colors: "bg-slate-100 text-slate-700 border-slate-200" },
  in_review: { label: "U pregledu", colors: "bg-amber-50 text-amber-700 border-amber-200" },
  submitted: { label: "Predato", colors: "bg-blue-50 text-blue-700 border-blue-200" },
  won: { label: "Pobijeđeno", colors: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost: { label: "Izgubljeno", colors: "bg-red-50 text-red-700 border-red-200" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDemoAccount = isDemoUser(user.email);
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, jib, keywords, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as {
    id: string;
    name: string;
    jib: string;
    keywords: string[] | null;
    operating_regions: string[] | null;
  };

  // Calculate dates outside of query builder to avoid impure function warnings
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const [
    , // documentsCount (unused)
    { count: bidsCount },
    { count: wonBidsCount },
    { count: lostBidsCount },
    { data: expiringDocs },
    { data: recentBids },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).in("status", ["draft", "in_review", "submitted"]),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).eq("status", "won"),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", resolvedCompany.id).eq("status", "lost"),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", resolvedCompany.id)
      .not("expires_at", "is", null)
      .lte("expires_at", sixtyDaysFromNow)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("bids")
      .select("id, status, created_at, tenders(title, deadline, estimated_value)")
      .eq("company_id", resolvedCompany.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const demoDocuments = isDemoAccount ? getDemoDocuments(resolvedCompany.id) : [];
  const expiring = ((expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[]).length > 0
    ? ((expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[])
    : demoDocuments;
  const realBids = (recentBids ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: { title: string; deadline: string | null; estimated_value: number | null };
  }[];
  const bids = realBids.length > 0
    ? realBids
    : isDemoAccount
      ? demoBidSummaries.map((bid) => ({
        id: bid.id,
        status: bid.status,
        created_at: bid.created_at,
        tenders: {
          title: bid.tender.title,
          deadline: bid.tender.deadline,
          estimated_value: bid.tender.estimated_value,
        },
      }))
      : [];

  const totalActiveBids = (bidsCount ?? 0) + (wonBidsCount ?? 0) + (lostBidsCount ?? 0);
  const displayTotalBids = totalActiveBids > 0 ? totalActiveBids : bids.length;
  const displayDraftBids = (bidsCount ?? 0) > 0 ? (bidsCount ?? 0) : bids.filter((bid) => ["draft", "in_review", "submitted"].includes(bid.status)).length;
  const displayWonBids = (wonBidsCount ?? 0) > 0 ? (wonBidsCount ?? 0) : bids.filter((bid) => bid.status === "won").length;
  const displayLostBids = (lostBidsCount ?? 0) > 0 ? (lostBidsCount ?? 0) : bids.filter((bid) => bid.status === "lost").length;

  const subscriptionStatus = await getSubscriptionStatus(user.id, user.email);
  const { count: documentsCountValue } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", resolvedCompany.id);

  const { data: allBidRowsData } = await supabase
    .from("bids")
    .select("id, status, created_at, tenders(title, deadline, estimated_value, contracting_authority)")
    .eq("company_id", resolvedCompany.id)
    .order("created_at", { ascending: false });

  const allBidRows = ((allBidRowsData ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: {
      title: string;
      deadline: string | null;
      estimated_value: number | null;
      contracting_authority: string | null;
    } | null;
  }[]);

  const portfolioBids = allBidRows.length > 0
    ? allBidRows.map((bid) => ({
        id: bid.id,
        status: bid.status,
        created_at: bid.created_at,
        tenders: bid.tenders ?? {
          title: "Nepoznat tender",
          deadline: null,
          estimated_value: null,
          contracting_authority: null,
        },
      }))
    : isDemoAccount
      ? demoBidSummaries.map((bid) => ({
          id: bid.id,
          status: bid.status,
          created_at: bid.created_at,
          tenders: {
            title: bid.tender.title,
            deadline: bid.tender.deadline,
            estimated_value: bid.tender.estimated_value,
            contracting_authority: bid.tender.contracting_authority,
          },
        }))
      : [];

  const activePortfolioBids = portfolioBids.filter((bid) =>
    ["draft", "in_review", "submitted"].includes(bid.status)
  );
  const urgentBidDeadlines = activePortfolioBids
    .filter((bid) => bid.tenders.deadline)
    .sort(
      (a, b) =>
        new Date(a.tenders.deadline!).getTime() -
        new Date(b.tenders.deadline!).getTime()
    )
    .slice(0, 4);
  const submittedCount = activePortfolioBids.filter((bid) => bid.status === "submitted").length;
  const inReviewCount = activePortfolioBids.filter((bid) => bid.status === "in_review").length;
  const closedBidsCount = displayWonBids + displayLostBids;
  const winRate = closedBidsCount > 0 ? Math.round((displayWonBids / closedBidsCount) * 100) : null;
  const wonEstimatedValue = portfolioBids
    .filter((bid) => bid.status === "won")
    .reduce((sum, bid) => sum + (Number(bid.tenders.estimated_value) || 0), 0);

  let missingChecklistCount = 0;
  let totalChecklistCount = 0;
  const activeBidIds = activePortfolioBids.map((bid) => bid.id);
  if (activeBidIds.length > 0) {
    const { data: checklistOverview } = await supabase
      .from("bid_checklist_items")
      .select("status")
      .in("bid_id", activeBidIds);

    totalChecklistCount = checklistOverview?.length ?? 0;
    missingChecklistCount =
      checklistOverview?.filter((item) => item.status === "missing").length ?? 0;
  }

  const companyKeywords = resolvedCompany.keywords || [];
  const companyRegions = resolvedCompany.operating_regions || [];

  let relevantTenders: {
    id: string;
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
    contracting_authority_jib: string | null;
    raw_description: string | null;
  }[] = [];

  if (companyKeywords.length > 0) {
    const keywordConditions = companyKeywords
      .map((kw) => `title.ilike.%${kw}%,raw_description.ilike.%${kw}%`)
      .join(",");

    let relevantQuery = supabase
      .from("tenders")
      .select(
        "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, raw_description"
      )
      .gt("deadline", nowIso);

    if (keywordConditions) {
      relevantQuery = relevantQuery.or(keywordConditions);
    }

    const { data: relevantRows } = await relevantQuery
      .order("deadline", { ascending: true })
      .limit(60);

    const baseRelevantTenders = (relevantRows ?? []) as {
      id: string;
      title: string;
      deadline: string | null;
      estimated_value: number | null;
      contracting_authority: string | null;
      contracting_authority_jib: string | null;
      raw_description: string | null;
    }[];

    const scoreRegionMatch = (value: string | null | undefined) => {
      if (!value || companyRegions.length === 0) return 0;
      const lowerValue = value.toLowerCase();
      return companyRegions.some((region) => lowerValue.includes(region.toLowerCase()))
        ? 1
        : 0;
    };

    relevantTenders = [...baseRelevantTenders]
      .sort((a, b) => {
        const scoreA =
          scoreRegionMatch(a.contracting_authority) +
          scoreRegionMatch(a.title) +
          scoreRegionMatch(a.raw_description);
        const scoreB =
          scoreRegionMatch(b.contracting_authority) +
          scoreRegionMatch(b.title) +
          scoreRegionMatch(b.raw_description);

        if (scoreA !== scoreB) return scoreB - scoreA;

        return (
          new Date(a.deadline || nowIso).getTime() -
          new Date(b.deadline || nowIso).getTime()
        );
      })
      .slice(0, 12);
  }

  const relevantTenderCount = relevantTenders.length;
  const relevantTenderValue = relevantTenders.reduce(
    (sum, tender) => sum + (Number(tender.estimated_value) || 0),
    0
  );

  const topAuthoritiesMap = new Map<
    string,
    { name: string; count: number; totalValue: number }
  >();
  for (const tender of relevantTenders) {
    const key = tender.contracting_authority || "Nepoznat naručilac";
    const entry = topAuthoritiesMap.get(key);
    const amount = Number(tender.estimated_value) || 0;
    if (entry) {
      entry.count += 1;
      entry.totalValue += amount;
    } else {
      topAuthoritiesMap.set(key, { name: key, count: 1, totalValue: amount });
    }
  }
  const topRelevantAuthorities = [...topAuthoritiesMap.values()]
    .sort((a, b) => b.count - a.count || b.totalValue - a.totalValue)
    .slice(0, 3);

  const today = new Date().toISOString().split("T")[0];
  const { data: upcomingRowsData } = await supabase
    .from("planned_procurements")
    .select(
      "id, description, planned_date, estimated_value, contract_type, contracting_authorities(name, jib)"
    )
    .gte("planned_date", today)
    .order("planned_date", { ascending: true })
    .limit(3);

  const upcomingRows = ((upcomingRowsData ?? []) as {
    id: string;
    description: string | null;
    planned_date: string | null;
    estimated_value: number | null;
    contract_type: string | null;
    contracting_authorities: { name: string; jib: string } | null;
  }[]);

  const displayUpcomingRows = upcomingRows.length > 0
    ? upcomingRows
    : isDemoAccount
      ? demoUpcomingProcurements.slice(0, 3)
      : [];

  let competitorSnapshot: {
    name: string;
    jib: string;
    wins: number;
    total_value: number;
    win_rate: number | null;
  }[] = [];

  if (subscriptionStatus.isSubscribed) {
    const authorityJibs = [
      ...new Set(
        relevantTenders
          .map((tender) => tender.contracting_authority_jib)
          .filter((value): value is string => Boolean(value))
      ),
    ];

    if (authorityJibs.length > 0) {
      const { data: competitorAwards } = await supabase
        .from("award_decisions")
        .select("winner_name, winner_jib, winning_price")
        .in("contracting_authority_jib", authorityJibs)
        .not("winner_jib", "is", null)
        .limit(300);

      const competitorMap = new Map<
        string,
        { name: string; jib: string; wins: number; total_value: number }
      >();

      for (const award of competitorAwards ?? []) {
        if (!award.winner_jib || award.winner_jib === resolvedCompany.jib) continue;
        const existing = competitorMap.get(award.winner_jib);
        const amount = Number(award.winning_price) || 0;
        if (existing) {
          existing.wins += 1;
          existing.total_value += amount;
        } else {
          competitorMap.set(award.winner_jib, {
            name: award.winner_name ?? award.winner_jib,
            jib: award.winner_jib,
            wins: 1,
            total_value: amount,
          });
        }
      }

      const competitorJibs = [...competitorMap.keys()].slice(0, 10);
      const { data: competitorMarketRows } = competitorJibs.length > 0
        ? await supabase
            .from("market_companies")
            .select("jib, win_rate")
            .in("jib", competitorJibs)
        : { data: [] as { jib: string; win_rate: number | null }[] };

      const competitorWinRateMap = new Map(
        (competitorMarketRows ?? []).map((row) => [row.jib, row.win_rate])
      );

      competitorSnapshot = [...competitorMap.values()]
        .map((competitor) => ({
          ...competitor,
          win_rate: competitorWinRateMap.get(competitor.jib) ?? null,
        }))
        .sort((a, b) => b.wins - a.wins || b.total_value - a.total_value)
        .slice(0, 3);
    }
  }

  if (competitorSnapshot.length === 0 && isDemoAccount) {
    competitorSnapshot = demoCompetitors.slice(0, 3).map((competitor) => ({
      name: competitor.name,
      jib: competitor.jib,
      wins: competitor.wins,
      total_value: competitor.total_value,
      win_rate: competitor.win_rate,
    }));
  }

  const moduleCards = [
    {
      title: "Novi tenderi",
      description: "Relevantni tenderi za profil vaše firme.",
      metric: relevantTenderCount.toString(),
      meta: relevantTenderCount > 0 ? formatCompactCurrency(relevantTenderValue) : "Podesite profil",
      href: "/dashboard/tenders?tab=recommended",
      icon: Search,
      tone: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Moje ponude",
      description: "Aktivne i zatvorene ponude na jednom mjestu.",
      metric: displayTotalBids.toString(),
      meta: `${activePortfolioBids.length} aktivno`,
      href: "/dashboard/bids",
      icon: Briefcase,
      tone: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      title: "Moja dokumenta",
      description: "Vault i upozorenja na isticanje.",
      metric: String(documentsCountValue ?? demoDocuments.length),
      meta: expiring.length > 0 ? `${expiring.length} uskoro ističe` : "Sve uredno",
      href: "/dashboard/vault",
      icon: FileText,
      tone: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "Konkurencija",
      description: "Ko pobjeđuje u vašem prostoru.",
      metric: competitorSnapshot.length.toString(),
      meta: subscriptionStatus.isSubscribed ? "Profilisane firme" : "Premium pregled",
      href: subscriptionStatus.isSubscribed ? "/dashboard/intelligence/competitors" : "/dashboard/subscription",
      icon: Swords,
      tone: "bg-rose-50 text-rose-700 border-rose-100",
    },
    {
      title: "Analiza tržišta",
      description: "Aktivni tenderi, vrijednost i trendovi.",
      metric: formatCompactCurrency(relevantTenderValue),
      meta: relevantTenderCount > 0 ? `${relevantTenderCount} relevantnih` : "Tržišni pregled",
      href: subscriptionStatus.isSubscribed ? "/dashboard/intelligence" : "/dashboard/subscription",
      icon: BarChart3,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Planirano",
      description: "Tenderi prije zvanične objave.",
      metric: displayUpcomingRows.length.toString(),
      meta: subscriptionStatus.isSubscribed ? "Nadolazeće nabavke" : "Premium modul",
      href: subscriptionStatus.isSubscribed ? "/dashboard/intelligence/upcoming" : "/dashboard/subscription",
      icon: CalendarDays,
      tone: "bg-violet-50 text-violet-700 border-violet-100",
    },
  ];

  const documentsCount = documentsCountValue ?? demoDocuments.length;
  const dashboardBidRows = portfolioBids.slice(0, 6);
  const nextDeadlineInDays = urgentBidDeadlines[0]?.tenders.deadline
    ? daysUntil(urgentBidDeadlines[0].tenders.deadline)
    : null;
  const currentPlanName = subscriptionStatus.isSubscribed
    ? subscriptionStatus.plan.name
    : "Bez aktivne pretplate";

  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-8 lg:p-9">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_360px] xl:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1">
                <ShieldCheck className="size-4 text-blue-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Operativni centar
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                <CreditCard className="size-3.5" />
                {currentPlanName}
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]">
                Operativni i tržišni pregled za {resolvedCompany.name}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                Jedan ekran za novi tender, ponude u radu, dokumente pred istekom, konkurenciju i tržišne signale koji utiču na vašu narednu odluku.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-5 lg:p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Briefcase className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Aktivne ponude</p>
                <p className="mt-2 font-heading text-3xl font-bold text-slate-950 lg:text-[2rem]">{activePortfolioBids.length}</p>
                <p className="mt-2 text-xs text-slate-500">{submittedCount} predane · {inReviewCount} u pregledu</p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 lg:p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Search className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Relevantni tenderi</p>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-950">{relevantTenderCount}</p>
                <p className="mt-2 text-xs text-slate-500">{relevantTenderCount > 0 ? formatCompactCurrency(relevantTenderValue) : "Dopunite profil firme"}</p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 lg:p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Award className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Moji rezultati</p>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-950">{winRate !== null ? `${winRate}%` : "—"}</p>
                <p className="mt-2 text-xs text-slate-500">{displayWonBids} dobijeno · {displayLostBids} odbijeno</p>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 lg:p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <BellRing className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">Upozorenja</p>
                <p className="mt-2 font-heading text-2xl font-bold text-slate-950">{expiring.length + missingChecklistCount}</p>
                <p className="mt-2 text-xs text-slate-500">{expiring.length} dokumenta · {missingChecklistCount} otvorenih stavki</p>
              </div>
            </div>
          </div>

          <div className="w-full rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm lg:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Prioritet dana</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Šta je najbitnije</h2>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <ArrowUpRight className="size-5" />
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/dashboard/bids"
                className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700"
              >
                Otvori moje ponude
                <ChevronDown className="size-4 -rotate-90" />
              </Link>
              <Link
                href="/dashboard/tenders?tab=recommended"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Preporučeni tenderi
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/vault"
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Moja dokumenta
                <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <Clock className="size-4 text-blue-600" />
                  <p className="text-sm font-semibold">Najbliži rok</p>
                </div>
                <p className="font-heading text-3xl font-bold text-slate-950">
                  {nextDeadlineInDays !== null ? `${nextDeadlineInDays} dana` : "—"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {urgentBidDeadlines[0]?.tenders.title ?? "Trenutno nema aktivnih ponuda s rokom za praćenje."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <CircleAlert className="size-4 text-amber-600" />
                  <p className="text-sm font-semibold">Checklist upozorenja</p>
                </div>
                <p className="font-heading text-3xl font-bold text-slate-950">{missingChecklistCount}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {totalChecklistCount > 0
                    ? `Od ${totalChecklistCount} checklist stavki, ${missingChecklistCount} još traži akciju.`
                    : "Checklist stavke će se ovdje pojaviti nakon AI analize tendera."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex size-11 items-center justify-center rounded-2xl border ${item.tone}`}>
                <item.icon className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-slate-300 transition-colors group-hover:text-blue-700" />
            </div>
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-slate-500">{item.title}</p>
              <p className="font-heading text-3xl font-bold text-slate-950">{item.metric}</p>
              <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.meta}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_380px] xl:gap-7">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-950">Moje ponude</h2>
              <p className="mt-1 text-sm text-slate-500">Aktivne i nedavno otvorene ponude sa statusom, vrijednošću i narednom akcijom.</p>
            </div>
            <Link
              href="/dashboard/bids"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              Sve ponude
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-7 py-4">Naziv tendera</th>
                  <th className="px-7 py-4">Naručilac</th>
                  <th className="px-7 py-4">Rok</th>
                  <th className="px-7 py-4">Vrijednost</th>
                  <th className="px-7 py-4">Status</th>
                  <th className="px-7 py-4 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {dashboardBidRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-7 py-16 text-center">
                      <Briefcase className="mx-auto mb-3 size-10 text-slate-300" />
                      <p className="mb-1 font-semibold text-slate-900">Nemate otvorenih ponuda</p>
                      <p className="mb-4 text-sm text-slate-500">Krenite iz preporučenih tendera ili otvorite ručno novi workspace.</p>
                      <Link
                        href="/dashboard/tenders?tab=recommended"
                        className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                      >
                        Otvori preporučene tendere
                      </Link>
                    </td>
                  </tr>
                ) : (
                  dashboardBidRows.map((bid) => {
                    const status = STATUS_CONFIG[bid.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={bid.id} className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50/60">
                        <td className="px-7 py-4.5">
                          <div className="flex items-start gap-4">
                            <div className="mt-0.5 flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                              <FileText className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <Link href={`/dashboard/bids/${bid.id}`} className="line-clamp-2 font-semibold leading-6 text-slate-950 transition-colors hover:text-blue-700">
                                {bid.tenders.title}
                              </Link>
                              <p className="mt-1 text-sm text-slate-500">Otvoreno {formatDate(bid.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-7 py-4.5 text-sm text-slate-600">{bid.tenders.contracting_authority ?? "—"}</td>
                        <td className="px-7 py-4.5 text-sm font-medium text-slate-700">{formatDate(bid.tenders.deadline)}</td>
                        <td className="px-7 py-4.5 text-sm font-semibold text-slate-950">{formatCurrency(bid.tenders.estimated_value)}</td>
                        <td className="px-7 py-4.5">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.colors}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-7 py-4.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/bids/${bid.id}`}
                              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all duration-150 hover:border-slate-300 hover:text-slate-700"
                            >
                              <Eye className="size-4" />
                            </Link>
                            <Link
                              href={`/dashboard/bids/${bid.id}`}
                              className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-150 hover:border-slate-300 hover:text-slate-900"
                            >
                              <Pencil className="size-3.5" />
                              Uredi
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rokovi i upozorenja</p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-slate-950">Šta morate uraditi</h3>
            <div className="mt-5 space-y-3">
              {urgentBidDeadlines.length > 0 ? (
                urgentBidDeadlines.map((bid) => (
                  <div key={bid.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{bid.tenders.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{STATUS_CONFIG[bid.status]?.label ?? "Ponuda"}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        {bid.tenders.deadline ? `${daysUntil(bid.tenders.deadline)} dana` : "—"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Rok {formatDate(bid.tenders.deadline)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                  Trenutno nema aktivnih rokova koji zahtijevaju hitnu reakciju.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Vault i priprema</p>
            <h3 className="mt-2 font-heading text-2xl font-bold text-slate-950">Dokumenti i checklista</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <BellRing className="size-4 text-blue-600" />
                  <p className="text-sm font-semibold">Dokumenti pred istekom</p>
                </div>
                <p className="font-heading text-3xl font-bold text-slate-950">{expiring.length}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {expiring.length > 0
                    ? "Provjerite dokumente kojima uskoro ističe važenje."
                    : "Trenutno nema dokumenata kojima uskoro ističe važenje."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <p className="text-sm font-semibold">Pokriće checklista</p>
                </div>
                <p className="font-heading text-3xl font-bold text-slate-950">{totalChecklistCount > 0 ? `${totalChecklistCount - missingChecklistCount}/${totalChecklistCount}` : "—"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {totalChecklistCount > 0
                    ? `${missingChecklistCount} stavki još nije riješeno u aktivnim ponudama.`
                    : "AI analiza i checklist stavke će se pojaviti po tenderu."}
                </p>
              </div>
            </div>
            <Link href="/dashboard/vault" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800">
              Otvori Document Vault
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px] xl:gap-7">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tržište za vas</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Relevantni tenderi, naručioci i konkurencija</h2>
            </div>
            <Link
              href={subscriptionStatus.isSubscribed ? "/dashboard/intelligence" : "/dashboard/subscription"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
            >
              {subscriptionStatus.isSubscribed ? "Otvori analitiku" : "Aktiviraj analitiku"}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-medium text-slate-500">Aktivni relevantni tenderi</p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-950">{relevantTenderCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-medium text-slate-500">Ukupna vrijednost</p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-950">{formatCompactCurrency(relevantTenderValue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-medium text-slate-500">Procijenjena vrijednost dobijenih</p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-950">{formatCompactCurrency(wonEstimatedValue)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Najaktivniji naručioci</h3>
              <div className="mt-4 space-y-3">
                {topRelevantAuthorities.length > 0 ? (
                  topRelevantAuthorities.map((authority) => (
                    <div key={authority.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{authority.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{authority.count} tendera</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">{formatCompactCurrency(authority.totalValue)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                    Unesite ključne riječi i regije u profil firme da biste dobili personalizirane tržišne signale.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Konkurentski snapshot</h3>
              <div className="mt-4 space-y-3">
                {subscriptionStatus.isSubscribed ? (
                  competitorSnapshot.length > 0 ? (
                    competitorSnapshot.map((competitor) => (
                      <div key={competitor.jib} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{competitor.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{competitor.wins} pobjeda · {competitor.win_rate !== null ? `${competitor.win_rate}% uspješnost` : "bez podatka o uspješnosti"}</p>
                          </div>
                          <span className="text-xs font-semibold text-rose-700">{formatCompactCurrency(competitor.total_value)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                      Trenutno nema dovoljno tržišnih podataka da izdvojimo konkurente za vaš profil.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-slate-600">
                    Otključajte konkurenciju, tržišnu analitiku i planirane tendere kroz pretplatu.
                    <Link href="/dashboard/subscription" className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-700">
                      Pregled paketa
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Planirano</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Nadolazeći tenderi</h2>
            </div>
            <CalendarDays className="size-5 text-violet-600" />
          </div>

          <div className="mt-5 space-y-3">
            {subscriptionStatus.isSubscribed ? (
              displayUpcomingRows.length > 0 ? (
                displayUpcomingRows.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.description || "Bez opisa"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.contracting_authorities?.name ?? "Nepoznat naručilac"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2.5 py-1 font-medium">{item.planned_date ? formatDate(item.planned_date) : "Datum nije poznat"}</span>
                      {item.estimated_value ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">{formatCompactCurrency(Number(item.estimated_value))}</span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                  Trenutno nema planiranih nabavki u bazi za prikaz.
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-slate-600">
                Modul "Planirano" je premium funkcionalnost za rano otkrivanje nabavki prije formalne objave.
                <Link href="/dashboard/subscription" className="mt-3 inline-flex items-center gap-2 font-semibold text-violet-700">
                  Otključaj planirano
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="h-48 animate-pulse rounded-[1.75rem] border border-slate-200 bg-white" />}>
        <RecommendedTenders />
      </Suspense>
    </div>
  );
}
