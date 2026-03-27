import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Company, BidStatus } from "@/types/database";
import { BidsTable } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ClientBidsPageProps {
  params: Promise<{ id: string }>;
}

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
  tenders: {
    id: string;
    title: string;
    contracting_authority: string | null;
    deadline: string | null;
  };
}

export default async function ClientBidsPage(props: ClientBidsPageProps) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (!isAgencyPlan(plan)) {
    redirect("/dashboard");
  }

  // Verify this agency client belongs to this user
  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies (id, name, jib, industry, keywords, cpv_codes, operating_regions)")
    .eq("id", params.id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) {
    redirect("/dashboard/agency");
  }

  const company = agencyClient.companies as Company | null;

  if (!company) {
    redirect("/dashboard/agency");
  }

  // Fetch bids for this client
  const { data: bidsData } = await supabase
    .from("bids")
    .select("id, status, created_at, tenders(id, title, contracting_authority, deadline)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const bids = ((bidsData as BidWithTender[] | null) ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    created_at: b.created_at,
    tender: b.tenders,
  }));

  // Fetch all tenders for modal
  const { data: tendersData } = await supabase
    .from("tenders")
    .select("id, title, contracting_authority")
    .order("created_at", { ascending: false })
    .limit(500);

  const tenders = (tendersData ?? []) as {
    id: string;
    title: string;
    contracting_authority: string | null;
  }[];

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/client/${params.id}`}>
            <ArrowLeft className="size-4" />
            Nazad
          </Link>
        </Button>
        <div className="flex-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
              Ponude - {company.name}
            </h1>
            <p className="mt-1 text-base text-slate-500">
              Sve ponude ovog klijenta na jednom mjestu
            </p>
          </div>
          <NewBidModal tenders={tenders} />
        </div>
      </div>

      <BidsTable bids={bids} />
    </div>
  );
}
