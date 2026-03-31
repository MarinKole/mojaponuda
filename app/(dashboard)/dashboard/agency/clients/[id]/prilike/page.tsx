import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { OpportunityDashboardCard } from "@/components/dashboard/opportunity-dashboard-card";
import { LegalUpdateCard } from "@/components/dashboard/legal-update-card";
import { Sparkles, Scale } from "lucide-react";

export default async function AgencyClientPrilikePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agencyClientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (plan.id !== "agency") redirect("/dashboard");

  // Verify agency client belongs to this user
  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies(name)")
    .eq("id", agencyClientId)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const companyName = (agencyClient.companies as { name: string } | null)?.name ?? "Klijent";

  const [{ data: opportunities }, { data: legalUpdates }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, slug, type, title, issuer, category, value, deadline, location, ai_summary, ai_difficulty")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("legal_updates")
      .select("id, type, title, summary, source, source_url, published_date")
      .order("published_date", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  const poticaji = ((opportunities ?? []) as {
    id: string; slug: string; type: string; title: string; issuer: string;
    category: string | null; value: number | null; deadline: string | null;
    location: string | null; ai_summary: string | null; ai_difficulty: string | null;
  }[]).filter((o) => o.type === "poticaj");

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          Poticaji i grantovi
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Aktivni grantovi, subvencije i poticaji za {companyName}.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="size-5 text-blue-600" />
          <h2 className="font-heading text-xl font-bold text-slate-900">Poticaji i grantovi</h2>
        </div>
        {poticaji.length > 0 ? (
          <div className="space-y-3">
            {poticaji.map((o) => (
              <OpportunityDashboardCard key={o.id} opportunity={o} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <p className="text-sm text-slate-500">Poticaji se ažuriraju svakodnevno. Provjerite ponovo uskoro.</p>
          </div>
        )}
      </section>

      {(legalUpdates ?? []).length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Scale className="size-5 text-slate-600" />
            <h2 className="font-heading text-xl font-bold text-slate-900">Zakon i izmjene</h2>
          </div>
          <div className="space-y-3">
            {(legalUpdates ?? []).map((u) => (
              <LegalUpdateCard key={u.id} update={u} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
