import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Company, Document } from "@/types/database";
import { DocumentGrid } from "@/components/vault/document-grid";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ClientVaultPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientVaultPage(props: ClientVaultPageProps) {
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

  // Fetch documents for this client
  const { data: documentsData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const documents = (documentsData as Document[] | null) ?? [];

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
              Dokumenti - {company.name}
            </h1>
            <p className="mt-1 text-base text-slate-500">
              Dokumenti ovog klijenta i praćenje rokova
            </p>
          </div>
          <AddDocumentModal />
        </div>
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
