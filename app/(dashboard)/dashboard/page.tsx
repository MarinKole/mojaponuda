import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  FileText,
  Briefcase,
  Search,
  Award,
  AlertTriangle,
  ArrowRight,
  Clock,
  Plus,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BidStatus, Document as DocType } from "@/types/database";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-slate-500",
  in_review: "bg-amber-500",
  submitted: "bg-blue-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "NACRT",
  in_review: "U_PREGLEDU",
  submitted: "PREDATO",
  won: "POBIJEDJENO",
  lost: "IZGUBLJENO",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!company) redirect("/onboarding");

  const [
    { count: documentsCount },
    { count: bidsCount },
    { count: tendersCount },
    { count: awardsCount },
    { data: expiringDocs },
    { data: recentBids },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("tenders").select("*", { count: "exact", head: true }),
    supabase.from("award_decisions").select("*", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", company.id)
      .not("expires_at", "is", null)
      .lte("expires_at", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("bids")
      .select("id, status, created_at, tenders(title, deadline)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats: { title: string; value: number; icon: LucideIcon; accent: string; metric: string }[] = [
    { title: "AKTIVNI DOKUMENTI", value: documentsCount ?? 0, icon: FileText, accent: "text-blue-400", metric: "DOC_VAULT" },
    { title: "RADNE PONUDE", value: bidsCount ?? 0, icon: Briefcase, accent: "text-amber-400", metric: "BID_PIPELINE" },
    { title: "TENDERI BAZA", value: tendersCount ?? 0, icon: Search, accent: "text-emerald-400", metric: "MARKET_OPPS" },
    { title: "ANALIZIRANE ODLUKE", value: awardsCount ?? 0, icon: Award, accent: "text-purple-400", metric: "INTEL_DATA" },
  ];

  const expiring = (expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[];
  const bids = (recentBids ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: { title: string; deadline: string | null };
  }[];

  const now = new Date();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-1.5 bg-blue-500" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              System_Overview // {company.name.split(" ")[0]}
            </p>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Dashboard
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-emerald-400">STATUS: ONLINE</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">
            {now.toISOString().split('T')[0]} {now.toTimeString().split('T')[1].substring(0, 8)} UTC
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-px bg-slate-800 sm:grid-cols-2 lg:grid-cols-4 border border-slate-800">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-[#020611] p-5 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[9px] text-slate-500">{stat.metric}</span>
                <stat.icon className={`size-4 ${stat.accent}`} />
              </div>
              <p className="font-mono text-3xl font-light text-white mb-1">
                {stat.value.toLocaleString("bs-BA")}
              </p>
              <p className="font-mono text-[10px] font-bold text-slate-400">
                {stat.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Expiring Documents Alert */}
      {expiring.length > 0 && (
        <div className="border border-amber-900/50 bg-amber-950/10">
          <div className="flex items-center justify-between border-b border-amber-900/50 p-3 bg-amber-950/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <h3 className="font-mono text-xs font-bold text-amber-500">
                SYSTEM_ALERT: EXPIRING_DOCUMENTS
              </h3>
            </div>
            <Link href="/dashboard/vault" className="font-mono text-[10px] text-amber-500/70 hover:text-amber-400 flex items-center gap-1">
              VIEW_VAULT
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-amber-900/30">
            {expiring.map((doc) => {
              const days = daysUntil(doc.expires_at!);
              const urgent = days <= 14;
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 px-4">
                  <div className="flex items-center gap-4">
                    <FileText className="size-4 text-amber-500/50" />
                    <div>
                      <p className="text-sm font-medium text-slate-300">{doc.name}</p>
                      {doc.type && (
                        <p className="font-mono text-[9px] text-slate-500 mt-0.5">{doc.type.toUpperCase()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-mono text-xs font-bold ${urgent ? "text-red-500" : "text-amber-500"}`}>
                      {days === 0 ? "EXPIRES_TODAY" : days === 1 ? "EXPIRES_TOMORROW" : `T-${days}_DAYS`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Bids */}
        <div className="border border-slate-800 bg-[#020611] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-[#060b17]">
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-slate-500" />
              <h3 className="font-mono text-xs font-bold text-white">ACTIVE_PIPELINE</h3>
            </div>
            <Link href="/dashboard/bids" className="font-mono text-[10px] text-blue-500 hover:text-blue-400 flex items-center gap-1">
              VIEW_ALL
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {bids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-mono text-[10px] text-slate-500 mb-4">NO_ACTIVE_BIDS_FOUND</p>
              <Link
                href="/dashboard/tenders"
                className="font-mono text-xs text-blue-500 border border-blue-500/30 px-4 py-2 hover:bg-blue-500/10 transition-colors"
              >
                + SCAN_MARKET
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {bids.map((bid) => (
                <Link
                  key={bid.id}
                  href={`/dashboard/bids/${bid.id}`}
                  className="group flex items-center gap-4 p-4 transition-colors hover:bg-[#060b17]"
                >
                  <div className={`size-2 shrink-0 rounded-sm ${STATUS_DOT[bid.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                      {bid.tenders?.title ?? "N/A"}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`font-mono text-[9px] ${
                        bid.status === 'won' ? 'text-emerald-500' :
                        bid.status === 'lost' ? 'text-red-500' :
                        bid.status === 'submitted' ? 'text-blue-500' :
                        'text-slate-500'
                      }`}>
                        STATUS: {STATUS_LABEL[bid.status]}
                      </span>
                      {bid.tenders?.deadline && (
                        <>
                          <span className="text-slate-800">|</span>
                          <span className="font-mono text-[9px] text-slate-500 flex items-center gap-1">
                            <Clock className="size-2.5" />
                            DUE: {formatDate(bid.tenders.deadline)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-700 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border border-slate-800 bg-[#060b17] p-5">
          <h3 className="font-mono text-[10px] text-slate-500 mb-6">QUICK_ACTIONS //</h3>
          
          <div className="space-y-3">
            <Link href="/dashboard/vault" className="block">
              <div className="group border border-slate-800 bg-[#020611] p-4 transition-all hover:border-blue-500/50">
                <div className="flex items-center gap-3 mb-2">
                  <Plus className="size-4 text-blue-500" />
                  <p className="font-mono text-xs font-bold text-white">UPLOAD_DOCUMENT</p>
                </div>
                <p className="text-xs text-slate-500 ml-7">Dodajte novi dokument u trezor.</p>
              </div>
            </Link>

            <Link href="/dashboard/tenders" className="block">
              <div className="group border border-slate-800 bg-[#020611] p-4 transition-all hover:border-emerald-500/50">
                <div className="flex items-center gap-3 mb-2">
                  <Search className="size-4 text-emerald-500" />
                  <p className="font-mono text-xs font-bold text-white">SCAN_TENDERS</p>
                </div>
                <p className="text-xs text-slate-500 ml-7">Pretražite bazu aktivnih nabavki.</p>
              </div>
            </Link>

            <Link href="/dashboard/intelligence" className="block">
              <div className="group border border-slate-800 bg-[#020611] p-4 transition-all hover:border-purple-500/50">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="size-4 text-purple-500" />
                  <p className="font-mono text-xs font-bold text-white">MARKET_INTEL</p>
                </div>
                <p className="text-xs text-slate-500 ml-7">Analizirajte konkurente i trendove.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
