/**
 * Auditira da li SVAKA kategorija iz OFFERING_CATEGORY_OPTIONS ima
 * funkcionalno keyword/CPV pokrivanje za retrieval. Za svaku kategoriju
 * simulira "čistu" firmu (samo ta jedna kategorija) i mjeri:
 *   - koliko keyword-seeda sistem izvede preko buildProfileKeywordSeeds
 *   - koliko CPV-prefixa izvede preko buildBroadRetrievalCpvPrefixes
 *   - koliko aktivnih tendera keyword retrieve stvarno pronađe
 *
 * Izlazi sa exit code 1 ako bilo koja kategorija ima 0 seedsa — ovo
 * je onda gate za CI/deploy da se garantuje "sistemski" fix ostaje
 * sistemski i za svaku novu kategoriju dodanu u budućnosti.
 *
 *   npx tsx scripts/audit-category-coverage.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import {
  OFFERING_CATEGORY_OPTIONS,
  buildBroadRetrievalCpvPrefixes,
  buildProfileKeywordSeeds,
  type ParsedCompanyProfile,
} from "../lib/company-profile";

function simulateProfile(categoryId: string): ParsedCompanyProfile {
  const opt = OFFERING_CATEGORY_OPTIONS.find((o) => o.id === categoryId);
  return {
    primaryIndustry: opt?.focusId ?? null,
    offeringCategories: [categoryId],
    specializationIds: [],
    preferredTenderTypes: [],
    companyDescription: null,
    legacyIndustryText: null,
    manualKeywords: [],
  };
}

async function countTendersForSeeds(
  s: any,
  keywords: string[],
  cpvPrefixes: string[]
): Promise<number> {
  if (keywords.length === 0 && cpvPrefixes.length === 0) return 0;
  const escape = (t: string) =>
    t.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ");
  const conds: string[] = [];
  for (const k of keywords.slice(0, 12)) {
    const term = escape(k.trim());
    if (!term) continue;
    conds.push(`title.ilike.%${term}%`);
    conds.push(`raw_description.ilike.%${term}%`);
  }
  for (const p of cpvPrefixes.slice(0, 12)) {
    const term = escape(p.trim());
    if (!term) continue;
    conds.push(`cpv_code.ilike.${term}%`);
  }
  if (conds.length === 0) return 0;
  const nowIso = new Date().toISOString();
  const { data, error, count } = await s
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .or(conds.join(","))
    .or(`deadline.gt.${nowIso},deadline.is.null`);
  if (error) {
    console.error("  query error:", error.message);
    return 0;
  }
  return count ?? (data?.length ?? 0);
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log(`Auditing ${OFFERING_CATEGORY_OPTIONS.length} offering categories\n`);
  const rows: Array<{
    id: string;
    label: string;
    kw: number;
    cpv: number;
    matches: number;
    ok: boolean;
  }> = [];

  for (const opt of OFFERING_CATEGORY_OPTIONS) {
    const profile = simulateProfile(opt.id);
    const keywords = buildProfileKeywordSeeds(profile);
    const cpvPrefixes = buildBroadRetrievalCpvPrefixes(profile);
    const matches = await countTendersForSeeds(s, keywords, cpvPrefixes);
    const ok = keywords.length > 0 && matches > 0;
    rows.push({
      id: opt.id,
      label: opt.label,
      kw: keywords.length,
      cpv: cpvPrefixes.length,
      matches,
      ok,
    });
  }

  // print table
  const pad = (v: string | number, n: number) => String(v).padEnd(n);
  console.log(
    pad("category id", 32),
    pad("label", 42),
    pad("kw", 4),
    pad("cpv", 4),
    pad("active match", 13),
    "ok"
  );
  console.log("-".repeat(105));
  for (const r of rows) {
    console.log(
      pad(r.id, 32),
      pad(r.label.slice(0, 40), 42),
      pad(r.kw, 4),
      pad(r.cpv, 4),
      pad(r.matches, 13),
      r.ok ? "OK" : "FAIL"
    );
  }

  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? "All categories pass." : `${failed.length} categor${failed.length === 1 ? "y" : "ies"} fail:`}`);
  for (const r of failed) console.log(`  - ${r.id} (${r.label}): kw=${r.kw} matches=${r.matches}`);

  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
