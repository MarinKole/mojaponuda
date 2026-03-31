import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";

interface HomePageProps {
  searchParams?: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;
  const errorCode = resolvedSearchParams?.error_code;
  const errorDescription = resolvedSearchParams?.error_description;

  if (error || errorCode || errorDescription) {
    const params = new URLSearchParams();

    if (error) params.set("error", error);
    if (errorCode) params.set("error_code", errorCode);
    if (errorDescription) params.set("error_description", errorDescription);

    redirect(`/login?${params.toString()}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch recent opportunities for preview section
  const { data: recentOpportunities } = await supabase
    .from("opportunities")
    .select("id, slug, type, title, issuer, category, value, deadline, location, ai_summary, ai_difficulty")
    .eq("published", true)
    .eq("status", "active")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(6);

  // Fetch recent legal updates for preview section
  const { data: recentLegalUpdates } = await supabase
    .from("legal_updates")
    .select("id, type, title, summary, source, source_url, published_date, relevance_tags")
    .order("published_date", { ascending: false, nullsFirst: false })
    .limit(3);

  return (
    <LandingPage
      isLoggedIn={!!user}
      recentOpportunities={recentOpportunities ?? []}
      recentLegalUpdates={recentLegalUpdates ?? []}
    />
  );
}
