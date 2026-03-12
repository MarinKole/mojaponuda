import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company, Document } from "@/types/database";
import { DocumentGrid } from "@/components/vault/document-grid";
import { AddDocumentModal } from "@/components/vault/add-document-modal";

export default async function VaultPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Dohvati firmu korisnika
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;

  if (!company) {
    redirect("/onboarding");
  }

  // Dohvati sve dokumente firme
  const { data: documentsData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const documents = (documentsData as Document[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="size-1.5 bg-blue-500" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Module_Active // Secure_Vault
            </p>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Trezor Dokumenata
          </h2>
        </div>
        <AddDocumentModal />
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
