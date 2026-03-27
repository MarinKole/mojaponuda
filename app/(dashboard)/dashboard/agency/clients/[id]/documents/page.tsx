import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { Document } from "@/types/database";
import { DocumentGrid } from "@/components/vault/document-grid";
import { AddDocumentModal } from "@/components/vault/add-document-modal";

export default async function AgencyClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies (id, name)")
    .eq("id", id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as { id: string; name: string } | null;
  if (!company) notFound();

  const { data: documentsData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const documents = (documentsData ?? []) as Document[];

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Dokumenti — {company.name}
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Dokumenti ovog klijenta. Pratite rokove i upravljajte dokumentacijom.
          </p>
        </div>
        <AddDocumentModal />
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
