/**
 * Brza provjera stanja award_decisions tablice.
 * Koristi: npx tsx scripts/check-awards-stats.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countWhere(filter?: (q: ReturnType<typeof supabase.from>) => typeof q): Promise<number | null> {
  let q = supabase.from("award_decisions").select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) {
    console.error("   err:", error.message);
    return null;
  }
  return count;
}

async function main() {
  console.log("→ Award stats:");
  const total = await countWhere();
  console.log(`   Ukupno awarda:     ${total}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withTender = await countWhere((q: any) => q.not("tender_id", "is", null));
  console.log(`   S tender_id:       ${withTender} (${total ? ((withTender! / total) * 100).toFixed(1) : "?"}%)`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withNotice = await countWhere((q: any) => q.not("notice_id", "is", null));
  console.log(`   S notice_id:       ${withNotice} (${total ? ((withNotice! / total) * 100).toFixed(1) : "?"}%)`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withProc = await countWhere((q: any) => q.not("procedure_id", "is", null));
  console.log(`   S procedure_id:    ${withProc} (${total ? ((withProc! / total) * 100).toFixed(1) : "?"}%)`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withValue = await countWhere((q: any) => q.not("winning_price", "is", null));
  console.log(`   S winning_price:   ${withValue} (${total ? ((withValue! / total) * 100).toFixed(1) : "?"}%)`);

  console.log("");
  console.log("→ Tender stats:");
  const { count: totalTenders } = await supabase.from("tenders").select("id", { count: "exact", head: true });
  console.log(`   Ukupno tendera:    ${totalTenders}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
