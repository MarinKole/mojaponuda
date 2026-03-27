import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Company, Tender } from "@/types/database";
import { TenderCard } from "@/components/tenders/tender-card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";

interface ClientTendersPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PAGE_SIZE = 12;

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ClientTendersPage(props: ClientTendersPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
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

  // Build recommendation context for this client
  const recommendationContext = buildRecommendationContext(company);
  const hasSignals = hasRecommendationSignals(recommendationContext);

  const pageParam = getSingleParam(searchParams.page);
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
  const offset = (page - 1) * PAGE_SIZE;

  let tenders: Tender[] = [];
  let totalCount = 0;

  if (hasSignals) {
    const candidates = await fetchRecommendedTenderCandidates<RecommendationTenderInput>(
      supabase,
      recommendationContext,
      { select: "*", limit: 120 }
    );

    const scored = selectTenderRecommendations(candidates, recommendationContext, {
      minimumResults: 4,
    });

    totalCount = scored.length;
    tenders = scored.slice(offset, offset + PAGE_SIZE).map((s) => s.tender as unknown as Tender);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/client/${params.id}`}>
            <ArrowLeft className="size-4" />
            Nazad
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi za {company.name}
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Preporučeni tenderi bazirani na profilu klijenta
          </p>
        </div>
      </div>

      {!hasSignals ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Profil nije kompletan
          </h3>
          <p className="mb-6 max-w-md text-slate-500">
            Ovaj klijent nema dovoljno podataka u profilu za generisanje preporuka. Dopunite profil klijenta.
          </p>
          <Button asChild>
            <Link href={`/dashboard/agency/clients/${params.id}`}>Uredi profil klijenta</Link>
          </Button>
        </div>
      ) : tenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-24">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Nema preporuka
          </h3>
          <p className="max-w-md text-center text-slate-500">
            Trenutno nema aktivnih tendera koji odgovaraju profilu ovog klijenta.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/client/${params.id}/tenders?page=${page - 1}`}>
                    Prethodna
                  </Link>
                </Button>
              )}
              <span className="text-sm text-slate-500">
                Stranica {page} od {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/client/${params.id}/tenders?page=${page + 1}`}>
                    Sljedeća
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
