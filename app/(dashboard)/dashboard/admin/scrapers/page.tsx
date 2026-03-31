import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ScraperSourcesList } from "@/components/admin/scraper-sources-list";

export const metadata: Metadata = {
  title: "Scraper izvori | Admin",
};

export default async function ScrapersPage() {
  const supabase = await createClient();

  // Fetch recent scraper logs
  const { data: logs } = await supabase
    .from("scraper_log")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scraper izvori</h1>
        <p className="text-muted-foreground mt-2">
          Upravljajte izvorima podataka i pokrenite individualno scrapanje
        </p>
      </div>

      <ScraperSourcesList initialLogs={logs ?? []} />
    </div>
  );
}
