/**
 * Backfills cpv_code on every public.tenders row that currently has NULL.
 *
 * Uses the same EJN OData pipeline the live sync uses (Lots →
 * LotCpvCodeLinks → CpvCodes), joined in memory because $expand is not
 * supported by open.ejn.gov.ba.
 *
 *   node scripts/backfill-tender-cpv.mjs            # backfill rows missing CPV
 *   node scripts/backfill-tender-cpv.mjs --all      # also refresh rows that already have a CPV
 *   node scripts/backfill-tender-cpv.mjs --active   # only currently-active tenders
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(name) {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const refreshAll = process.argv.includes("--all");
const activeOnly = process.argv.includes("--active");

const BASE = process.env.EJN_API_BASE_URL || "https://open.ejn.gov.ba";
const PAGE = 50;

async function odata(endpoint, filter, orderby = "Id desc") {
  const out = [];
  let skip = 0;
  for (;;) {
    const params = new URLSearchParams({
      $top: String(PAGE),
      $skip: String(skip),
      $orderby: orderby,
    });
    if (filter) params.set("$filter", filter);
    const url = `${BASE}${endpoint}?${params.toString()}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`EJN ${endpoint} → ${r.status}`);
    const d = await r.json();
    const items = d.value ?? [];
    out.push(...items);
    if (items.length < PAGE) break;
    skip += PAGE;
  }
  return out;
}

async function fetchAllCpvCodes() {
  const rows = await odata("/CpvCodes");
  const m = new Map();
  for (const r of rows) {
    const id = Number(r.Id);
    const digits = String(r.Code ?? "").replace(/[^0-9]/g, "").slice(0, 8);
    if (Number.isFinite(id) && digits.length >= 5) m.set(id, digits);
  }
  return m;
}

async function fetchLotsByProcedureIds(procIds) {
  const out = [];
  // EJN OData MaxNodeCount=100 — 25 IDs rejects with 400, 20 works.
  const chunk = 20;
  for (let i = 0; i < procIds.length; i += chunk) {
    const batch = procIds.slice(i, i + chunk);
    const filter = batch.map((id) => `ProcedureId eq ${id}`).join(" or ");
    const rows = await odata("/Lots", filter);
    for (const r of rows) {
      const id = Number(r.Id);
      const pid = Number(r.ProcedureId);
      if (Number.isFinite(id) && Number.isFinite(pid)) out.push({ Id: id, ProcedureId: pid });
    }
    if (i % 400 === 0) process.stdout.write(`.lots ${i + batch.length}/${procIds.length} `);
  }
  return out;
}

async function fetchMainCpvLinksByLotIds(lotIds) {
  const out = [];
  // Extra `and IsMain eq true` pushes us closer to the cap → 18 IDs.
  const chunk = 18;
  for (let i = 0; i < lotIds.length; i += chunk) {
    const batch = lotIds.slice(i, i + chunk);
    const filter = `(${batch.map((id) => `LotId eq ${id}`).join(" or ")}) and IsMain eq true`;
    const rows = await odata("/LotCpvCodeLinks", filter);
    for (const r of rows) {
      const lotId = Number(r.LotId);
      const cpvId = Number(r.CpvCodeId);
      if (Number.isFinite(lotId) && Number.isFinite(cpvId)) out.push({ LotId: lotId, CpvCodeId: cpvId });
    }
    if (i % 400 === 0) process.stdout.write(`.links ${i + batch.length}/${lotIds.length} `);
  }
  return out;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1) Which tenders need CPV? (paged — Supabase caps single select at 1000 rows)
  const tenders = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = s
      .from("tenders")
      .select("id,portal_id,deadline,cpv_code")
      .range(from, from + pageSize - 1);
    if (!refreshAll) q = q.is("cpv_code", null);
    if (activeOnly) {
      const nowIso = new Date().toISOString();
      q = q.or(`deadline.gt.${nowIso},deadline.is.null`);
    }
    const { data, error } = await q;
    if (error) throw error;
    tenders.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  console.log(`Tenders to process: ${tenders.length}`);

  const byPortal = new Map();
  const procIds = [];
  for (const t of tenders) {
    const pid = Number(t.portal_id);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    byPortal.set(pid, t);
    procIds.push(pid);
  }
  console.log(`Distinct ProcedureIds: ${procIds.length}`);
  if (procIds.length === 0) return;

  // 2) Fetch reference data + join
  console.log("Fetching CpvCodes reference table...");
  const cpvMap = await fetchAllCpvCodes();
  console.log(`CpvCodes indexed: ${cpvMap.size}`);

  console.log("Fetching Lots...");
  const lots = await fetchLotsByProcedureIds(procIds);
  console.log(`\nLots: ${lots.length}`);

  const lotIds = [...new Set(lots.map((l) => l.Id))];
  console.log("Fetching LotCpvCodeLinks (IsMain)...");
  const links = await fetchMainCpvLinksByLotIds(lotIds);
  console.log(`\nMain CPV links: ${links.length}`);

  const lotToCpv = new Map();
  for (const l of links) {
    if (lotToCpv.has(l.LotId)) continue;
    const code = cpvMap.get(l.CpvCodeId);
    if (code) lotToCpv.set(l.LotId, code);
  }
  const procToCpv = new Map();
  for (const lot of lots) {
    if (procToCpv.has(lot.ProcedureId)) continue;
    const code = lotToCpv.get(lot.Id);
    if (code) procToCpv.set(lot.ProcedureId, code);
  }

  // 3) Write back in batches
  const updates = [];
  for (const [pid, row] of byPortal.entries()) {
    const cpv = procToCpv.get(pid);
    if (cpv && row.cpv_code !== cpv) updates.push({ id: row.id, cpv_code: cpv });
  }
  console.log(`\nTenders that will get a CPV: ${updates.length} / ${tenders.length}`);

  let ok = 0;
  let fail = 0;
  const batch = 100;
  for (let i = 0; i < updates.length; i += batch) {
    const chunk = updates.slice(i, i + batch);
    await Promise.all(
      chunk.map(async (u) => {
        const { error: uerr } = await s
          .from("tenders")
          .update({ cpv_code: u.cpv_code })
          .eq("id", u.id);
        if (uerr) {
          fail += 1;
          console.error(`  update fail for ${u.id}: ${uerr.message}`);
        } else {
          ok += 1;
        }
      })
    );
    process.stdout.write(`\r  wrote ${ok + fail}/${updates.length}`);
  }
  console.log(`\nDone. Updated: ${ok}, failed: ${fail}.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
