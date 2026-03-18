import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { count: totalCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true });

  console.log("Total tenders in DB:", totalCount);

  const now = new Date().toISOString();
  const { count: futureCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gt("deadline", now);

  console.log("Future deadline tenders:", futureCount);

  const { count: nullDeadlineCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .is("deadline", null);

  console.log("Null deadline tenders:", nullDeadlineCount);

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentPastCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .lte("deadline", now)
    .gte("deadline", ninetyDaysAgo);

  console.log("Recent past (90d) tenders:", recentPastCount);

  const { data: latestTenders } = await supabase
    .from("tenders")
    .select("id, title, deadline, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("\nLatest 5 tenders by created_at:");
  for (const t of latestTenders ?? []) {
    console.log(`  - ${t.title?.slice(0, 60)} | deadline: ${t.deadline} | created: ${t.created_at}`);
  }

  const { data: latestByDeadline } = await supabase
    .from("tenders")
    .select("id, title, deadline")
    .not("deadline", "is", null)
    .order("deadline", { ascending: false })
    .limit(5);

  console.log("\nLatest 5 tenders by deadline:");
  for (const t of latestByDeadline ?? []) {
    console.log(`  - ${t.title?.slice(0, 60)} | deadline: ${t.deadline}`);
  }
}

main().catch(console.error);
