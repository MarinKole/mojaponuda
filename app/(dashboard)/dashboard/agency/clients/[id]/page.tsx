import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { AgencyClientDetail } from "@/components/agency/agency-client-detail";

export default async function AgencyClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") redirect("/dashboard/agency");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select(`
      id, status, crm_stage, notes, contract_start, contract_end, monthly_fee, created_at, updated_at, company_id,
      companies (
        id, name, jib, pdv, address, contact_email, contact_phone, industry, cpv_codes, keywords, operating_regions
      )
    `)
    .eq("id", id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as {
    id: string; name: string; jib: string; pdv: string | null; address: string | null;
    contact_email: string | null; contact_phone: string | null; industry: string | null;
    cpv_codes: string[] | null; keywords: string[] | null; operating_regions: string[] | null;
  } | null;

  if (!company) notFound();

  // Fetch all client data in parallel
  const [
    { data: bidsData },
    { data: docsData },
    { data: notesData },
    { data: tendersData },
  ] = await Promise.all([
    supabase
      .from("bids")
      .select("id, status, created_at, tenders(id, title, deadline, estimated_value, contracting_authority)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("documents")
      .select("id, name, type, expires_at, size, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("agency_client_notes")
      .select("id, note, created_at")
      .eq("agency_client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenders")
      .select("id, title, deadline, estimated_value, contracting_authority, contract_type")
      .gt("deadline", new Date().toISOString())
      .order("deadline", { ascending: true })
      .limit(5),
  ]);

  return (
    <AgencyClientDetail
      agencyClientId={id}
      client={agencyClient as {
        id: string; crm_stage: string; notes: string | null;
        contract_start: string | null; contract_end: string | null;
        monthly_fee: number | null; created_at: string;
      }}
      company={company}
      bids={(bidsData ?? []) as Array<{
        id: string; status: string; created_at: string;
        tenders: { id: string; title: string; deadline: string | null; estimated_value: number | null; contracting_authority: string | null } | null;
      }>}
      docs={(docsData ?? []) as Array<{
        id: string; name: string; type: string | null; expires_at: string | null; size: number; created_at: string;
      }>}
      notes={(notesData ?? []) as Array<{ id: string; note: string; created_at: string }>}
      recentTenders={(tendersData ?? []) as Array<{
        id: string; title: string; deadline: string | null; estimated_value: number | null;
        contracting_authority: string | null; contract_type: string | null;
      }>}
    />
  );
}
