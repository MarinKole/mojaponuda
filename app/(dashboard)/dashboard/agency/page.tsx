import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { AgencyCRMDashboard } from "@/components/agency/agency-crm-dashboard";

export default async function AgencyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  if (plan.id !== "agency") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Agencijski paket</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Funkcije za vođenje klijenata dostupne su samo sa Agencijskim paketom. Vaš trenutni plan je <strong>{plan.name}</strong>.
          </p>
          <a
            href="/dashboard/subscription"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-700"
          >
            Nadogradite paket
          </a>
        </div>
      </div>
    );
  }

  // Fetch agency clients with company data
  const { data: agencyClients } = await supabase
    .from("agency_clients")
    .select(`
      id,
      status,
      crm_stage,
      notes,
      contract_start,
      contract_end,
      monthly_fee,
      created_at,
      updated_at,
      company_id,
      companies (
        id,
        name,
        jib,
        industry,
        contact_email,
        contact_phone,
        operating_regions,
        keywords,
        cpv_codes
      )
    `)
    .eq("agency_user_id", user.id)
    .order("created_at", { ascending: false });

  const clients = (agencyClients ?? []) as Array<{
    id: string;
    status: string;
    crm_stage: string;
    notes: string | null;
    contract_start: string | null;
    contract_end: string | null;
    monthly_fee: number | null;
    created_at: string;
    updated_at: string;
    company_id: string;
    companies: {
      id: string;
      name: string;
      jib: string;
      industry: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      operating_regions: string[] | null;
      keywords: string[] | null;
      cpv_codes: string[] | null;
    } | null;
  }>;

  // Fetch bid counts per company for KPI summary
  const companyIds = clients.map((c) => c.company_id).filter(Boolean);
  
  let bidsByCompany: Record<string, { total: number; won: number; active: number }> = {};
  let docsByCompany: Record<string, number> = {};

  if (companyIds.length > 0) {
    const [{ data: bidsData }, { data: docsData }] = await Promise.all([
      supabase
        .from("bids")
        .select("company_id, status")
        .in("company_id", companyIds),
      supabase
        .from("documents")
        .select("company_id")
        .in("company_id", companyIds),
    ]);

    for (const bid of bidsData ?? []) {
      if (!bid.company_id) continue;
      if (!bidsByCompany[bid.company_id]) {
        bidsByCompany[bid.company_id] = { total: 0, won: 0, active: 0 };
      }
      bidsByCompany[bid.company_id].total++;
      if (bid.status === "won") bidsByCompany[bid.company_id].won++;
      if (["draft", "in_review", "submitted"].includes(bid.status)) {
        bidsByCompany[bid.company_id].active++;
      }
    }

    for (const doc of docsData ?? []) {
      if (!doc.company_id) continue;
      docsByCompany[doc.company_id] = (docsByCompany[doc.company_id] ?? 0) + 1;
    }
  }

  const totalMonthlyRevenue = clients.reduce((sum, c) => sum + (c.monthly_fee ?? 0), 0);
  const activeClients = clients.filter((c) => c.crm_stage === "active").length;

  return (
    <AgencyCRMDashboard
      clients={clients}
      bidsByCompany={bidsByCompany}
      docsByCompany={docsByCompany}
      totalMonthlyRevenue={totalMonthlyRevenue}
      activeClients={activeClients}
    />
  );
}
