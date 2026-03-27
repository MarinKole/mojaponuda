import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";
import { TenderCard } from "@/components/tenders/tender-card";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AgencyClientTendersPage({
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
    .select(`
      id, company_id,
      companies (
        id, name, industry, cpv_codes, keywords, operating_regions
      )
    `)
    .eq("id", id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as {
    id: string; name: string; industry: string | null;
    cpv_codes: string[] | null; keywords: string[] | null; operating_regions: string[] | null;
  } | null;

  if (!company) notFound();

  const recommendationContext = buildRecommendationContext({
    industry: company.industry,
    keywords: company.keywords,
    cpv_codes: company.cpv_codes,
    operating_regions: company.operating_regions,
  });

  if (!hasRecommendationSignals(recommendationContext)) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi — {company.name}
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Preporučeni tenderi za ovog klijenta na osnovu profila firme.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">Profil nije dovoljno popunjen</h3>
          <p className="mb-6 max-w-md text-slate-500">
            Da bi sistem mogao preporučiti tendere, profil klijenta mora imati djelatnosti, lokaciju ili opis.
          </p>
          <Button asChild>
            <Link href={`/dashboard/agency/clients/${id}`}>Nazad na klijenta</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fetch existing bids for this company to mark already-bid tenders
  const { data: existingBids } = await supabase
    .from("bids")
    .select("tender_id")
    .eq("company_id", company.id);

  const existingBidTenderIds = new Set((existingBids ?? []).map((b) => b.tender_id));

  const candidates = await fetchRecommendedTenderCandidates<RecommendationTenderInput>(
    supabase,
    recommendationContext,
    {
      limit: 200,
      select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code, ai_analysis, authority_city, authority_municipality, authority_canton, authority_entity",
    }
  );

  const scored = selectTenderRecommendations(candidates, recommendationContext, {
    minimumResults: 6,
  });

  // Filter out already-bid tenders
  const tenders = scored
    .filter((s) => !existingBidTenderIds.has(s.tender.id))
    .map((s) => ({
      ...s.tender,
      score: s.score,
      reasons: s.reasons,
    }));

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Tenderi — {company.name}
        </h1>
        <p className="mt-1.5 text-base text-slate-500">
          Preporučeni tenderi za ovog klijenta na osnovu profila, djelatnosti i lokacije.
        </p>
      </div>

      {tenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">Nema preporučenih tendera</h3>
          <p className="max-w-md text-slate-500">
            Trenutno nema aktivnih tendera koji odgovaraju profilu ovog klijenta. Provjerite ponovo kasnije.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tenders.map((tender) => (
            <TenderCard
              key={tender.id}
              tender={tender as any}
            />
          ))}
        </div>
      )}
    </div>
  );
}
