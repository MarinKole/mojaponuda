/**
 * Prisilni resync award_decisions iz EJN API-ja.
 *
 * Svrha: Kad smo istorijski napunili `tenders` tablicu, postojeci awardi u bazi
 * i dalje imaju `tender_id = NULL` i prazne `notice_id`/`procedure_id` kolone
 * (jer su ingestirani prije migracije koja je uvela ta polja). Rjesenje je da
 * EJN API ponovo posalje SVE awarde — sync ce sada:
 *   (a) popuniti notice_id + procedure_id
 *   (b) uspostaviti tender_id preko buildTenderIdMap koji ima 258K tendera
 *
 * Kako radi:
 *   1. Brise `ejn_sync_log` red za endpoint "Awards" (tako da lastSync vrati null)
 *   2. Poziva runManualSyncJob("Awards") koji interno zove syncAwardDecisions
 *   3. Reportira rezultat
 *
 * Koristi: npx tsx scripts/resync-awards.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";
import { runManualSyncJob } from "@/sync/ejn-sync";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Nedostaju env varijable: NEXT_PUBLIC_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.time("resync-awards");

  // 1. Resetuj sync log za Awards endpoint (forsiraj full refetch)
  console.log("→ Brisem sync_log za endpoint 'Awards' (force full refetch) …");
  const { error: delError } = await supabase.from("sync_log").delete().eq("endpoint", "Awards");
  if (delError) {
    console.error("   FATAL: nije mogao obrisati sync log:", delError.message);
    process.exit(1);
  }
  console.log("   ✓ Sync log obrisan");

  // 2. Pokreni manual sync job za Awards
  console.log("→ Pokrećem runManualSyncJob('Awards') … (može trajati 5-10 min)");
  const result = await runManualSyncJob("Awards");

  console.log("");
  console.log("✓ Awards resync završen:");
  console.log(`   Status:       ${result.status}`);
  console.log(`   Dodano:       ${result.added}`);
  console.log(`   Azurirano:    ${result.updated}`);
  console.log(`   Trajanje:     ${(result.duration_ms / 1000).toFixed(1)}s`);
  if (result.error) console.log(`   Greska:       ${result.error}`);

  // 3. Provjerimo koliko awarda sad ima tender_id
  const { count: totalCount } = await supabase
    .from("award_decisions")
    .select("*", { count: "exact", head: true });
  const { count: linkedCount } = await supabase
    .from("award_decisions")
    .select("*", { count: "exact", head: true })
    .not("tender_id", "is", null);
  const { count: withNoticeId } = await supabase
    .from("award_decisions")
    .select("*", { count: "exact", head: true })
    .not("notice_id", "is", null);

  console.log("");
  console.log("→ Statistika nakon resync-a:");
  console.log(`   Ukupno awarda:          ${totalCount}`);
  console.log(`   S tender_id:            ${linkedCount} (${totalCount ? ((linkedCount! / totalCount) * 100).toFixed(1) : 0}%)`);
  console.log(`   S notice_id:            ${withNoticeId} (${totalCount ? ((withNoticeId! / totalCount) * 100).toFixed(1) : 0}%)`);
  console.timeEnd("resync-awards");
  console.log("");
  console.log("→ Sljedeci korak: npx tsx scripts/backfill-analytics.ts");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
