/**
 * Backfill award_decisions.notice_id + procedure_id + tender_id.
 *
 * Umjesto punog resync-a (koji je pao na fetch timeout-u), ova skripta:
 *   1. Dohvata SVE award-e iz EJN API-ja (fetchAwardNotices bez lastSync)
 *   2. Gradi mapu portal_award_id → { NoticeId, ProcedureId }
 *   3. Gradi mapu tender.portal_id → tender.id
 *   4. Za svaki existing award u bazi bez notice_id/tender_id:
 *      - Ako ima par u EJN feedu, update-uje ga
 *
 * Fokusirana operacija, bez overhead-a seedinga autoritet, supplier groups itd.
 * Ako pukne, bezbjedno za ponovno pokretanje.
 *
 * Koristi: npx tsx scripts/backfill-award-notice-ids.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";
import { fetchAwardNoticesByIds, type EjnAwardNotice } from "@/lib/ejn-api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAGE_SIZE = 500;

async function fetchAllTenderPortalMap(): Promise<Map<string, string>> {
  console.log("→ Dohvatam tender portal_id → id mapu (258K+ redova, keyset) …");
  const map = new Map<string, string>();
  let lastId: string | null = null;

  while (true) {
    let q = supabase
      .from("tenders")
      .select("id, portal_id")
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId) q = q.gt("id", lastId);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const t of data) {
      if (t.portal_id) map.set(t.portal_id, t.id);
    }
    if (map.size % 50000 < PAGE_SIZE) process.stdout.write(`   … ${map.size}\r`);
    if (data.length < PAGE_SIZE) break;
    lastId = data[data.length - 1].id;
  }
  console.log(`   indeksirano ${map.size} tendera`);
  return map;
}

interface AwardRow {
  id: string;
  portal_award_id: string | null;
  notice_id: string | null;
  tender_id: string | null;
}

async function fetchAwardsNeedingUpdate(): Promise<AwardRow[]> {
  console.log("→ Dohvatam award_decisions (notice_id IS NULL OR tender_id IS NULL) …");
  const all: AwardRow[] = [];
  let lastId: string | null = null;
  while (true) {
    let q = supabase
      .from("award_decisions")
      .select("id, portal_award_id, notice_id, tender_id")
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId) q = q.gt("id", lastId);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (!row.notice_id || !row.tender_id) {
        all.push({
          id: row.id,
          portal_award_id: row.portal_award_id ?? null,
          notice_id: row.notice_id ?? null,
          tender_id: row.tender_id ?? null,
        });
      }
    }
    if (data.length < PAGE_SIZE) break;
    lastId = data[data.length - 1].id;
  }
  console.log(`   ${all.length} awarda treba update`);
  return all;
}

async function main() {
  console.time("backfill-award-notice-ids");

  // 1. Tender portal → id mapa
  const tenderPortalMap = await fetchAllTenderPortalMap();

  // 2. Awardi koji trebaju update (iz nase baze)
  const awards = await fetchAwardsNeedingUpdate();
  if (awards.length === 0) {
    console.log("Nema awarda koji trebaju update. Gotovo.");
    return;
  }

  // 3. Dohvati iz EJN API-ja po portal_award_id-jevima u chunk-evima
  // (fetchAwardNoticesByIds vec dijeli u 20-per-batch i paralelizuje unutar chunk-a)
  const portalIds = awards.map((a) => a.portal_award_id).filter((x): x is string => Boolean(x));
  console.log(`→ fetchAwardNoticesByIds za ${portalIds.length} award ID-jeva (chunk-evi od 200, sequential) …`);

  const awardIdMap = new Map<string, { noticeId: string | null; procedureId: string | null }>();
  const CHUNK_SIZE = 200;
  for (let i = 0; i < portalIds.length; i += CHUNK_SIZE) {
    const chunk = portalIds.slice(i, i + CHUNK_SIZE);
    try {
      const ejnAwards: EjnAwardNotice[] = await fetchAwardNoticesByIds(chunk);
      for (const a of ejnAwards) {
        awardIdMap.set(a.AwardId, {
          noticeId: a.NoticeId ?? null,
          procedureId: a.ProcedureId ?? null,
        });
      }
      process.stdout.write(`   … ${Math.min(i + CHUNK_SIZE, portalIds.length)}/${portalIds.length} (${awardIdMap.size} match)\r`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`\n   chunk ${i}-${i + CHUNK_SIZE} pao: ${msg.slice(0, 100)} — preskacem`);
    }
  }
  console.log(`\n   dobiveno ${awardIdMap.size} awarda iz EJN API-ja`);

  // 5. Računaj potrebne update-ove
  console.log("→ Računam potrebne update-ove …");
  const updates: Array<{ id: string; notice_id: string | null; procedure_id: string | null; tender_id: string | null }> = [];
  let noMatchInEjn = 0;

  for (const award of awards) {
    if (!award.portal_award_id) continue;
    const ejnMatch = awardIdMap.get(award.portal_award_id);
    if (!ejnMatch) {
      noMatchInEjn++;
      continue;
    }

    const noticeId = ejnMatch.noticeId;
    const procedureId = ejnMatch.procedureId;
    const tenderId =
      award.tender_id ??
      (noticeId && tenderPortalMap.get(noticeId)) ??
      (procedureId && tenderPortalMap.get(procedureId)) ??
      null;

    // Update-uj samo ako bilo šta mijenjamo
    if (
      (noticeId && !award.notice_id) ||
      (procedureId && !award.notice_id) ||
      (tenderId && !award.tender_id)
    ) {
      updates.push({
        id: award.id,
        notice_id: noticeId ?? award.notice_id,
        procedure_id: procedureId,
        tender_id: tenderId,
      });
    }
  }

  console.log(`   ${updates.length} awarda za update`);
  console.log(`   ${noMatchInEjn} awarda nije nadjen u EJN feed-u (vjerovatno obrisani)`);

  // 6. Apliciraj updateove u batch-evima
  if (updates.length === 0) {
    console.log("Nema izmjena. Gotovo.");
    return;
  }

  console.log("→ Apliciram update-ove (batch od 20 konkurentno) …");
  const CHUNK = 100;
  const INNER = 20;
  let done = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    for (let j = 0; j < slice.length; j += INNER) {
      const batch = slice.slice(j, j + INNER);
      await Promise.all(
        batch.map((u) =>
          supabase
            .from("award_decisions")
            .update({
              notice_id: u.notice_id,
              procedure_id: u.procedure_id,
              ...(u.tender_id ? { tender_id: u.tender_id } : {}),
            })
            .eq("id", u.id)
        )
      );
    }
    done += slice.length;
    process.stdout.write(`   … ${done}/${updates.length}\r`);
  }
  console.log("");

  // 7. Statistika nakon
  console.log("→ Statistika nakon backfill-a:");
  const { count: total } = await supabase.from("award_decisions").select("id", { count: "exact", head: true });
  const { count: withTender } = await supabase
    .from("award_decisions")
    .select("id", { count: "exact", head: true })
    .not("tender_id", "is", null);
  const { count: withNotice } = await supabase
    .from("award_decisions")
    .select("id", { count: "exact", head: true })
    .not("notice_id", "is", null);
  console.log(`   Ukupno awarda:  ${total}`);
  console.log(`   S tender_id:    ${withTender} (${total ? ((withTender! / total) * 100).toFixed(1) : 0}%)`);
  console.log(`   S notice_id:    ${withNotice} (${total ? ((withNotice! / total) * 100).toFixed(1) : 0}%)`);

  console.timeEnd("backfill-award-notice-ids");
  console.log("");
  console.log("→ Sljedeci korak: npx tsx scripts/backfill-analytics.ts");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
