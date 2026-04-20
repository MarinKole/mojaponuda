/**
 * Prints retrieval coverage (keyword-only vs. CPV-only vs. UNION) for every
 * offering category in OFFERING_CATEGORY_OPTIONS. Proves the CPV-ingest +
 * broader-seeds fix is system-wide, not tailored to any single industry.
 *
 * Usage:  npx tsx scripts/audit-category-recall.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  OFFERING_CATEGORY_OPTIONS,
  PRIMARY_INDUSTRY_OPTIONS,
  buildRetrievalKeywordSeeds,
  buildBroadRetrievalCpvPrefixes,
  parseCompanyProfile,
} from "../lib/company-profile";
import { expandKeywordVariants } from "../lib/cyrillic-transliterate";

// Load .env.local manually (dotenv/config only reads .env)
import fs from "node:fs";
import path from "node:path";
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const nowIso = new Date().toISOString();

function escapeIlike(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

async function countKeywordMatches(keywords: string[]): Promise<number> {
  if (keywords.length === 0) return 0;
  const allVariants = keywords.slice(0, 30).flatMap((k) => expandKeywordVariants(k));
  const conds: string[] = [];
  for (const k of allVariants) {
    const safe = escapeIlike(k);
    if (!safe) continue;
    conds.push(`title.ilike.%${safe}%`);
    conds.push(`raw_description.ilike.%${safe}%`);
  }
  if (conds.length === 0) return 0;
  const { count } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .or(`deadline.gt.${nowIso},deadline.is.null`)
    .or(conds.join(","));
  return count ?? 0;
}

async function countCpvMatches(cpvPrefixes: string[]): Promise<number> {
  if (cpvPrefixes.length === 0) return 0;
  const conds = cpvPrefixes.map((p) => `cpv_code.ilike.${p}%`);
  const { count } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .or(`deadline.gt.${nowIso},deadline.is.null`)
    .or(conds.join(","));
  return count ?? 0;
}

async function countUnionMatches(keywords: string[], cpvPrefixes: string[]): Promise<number> {
  if (keywords.length === 0 && cpvPrefixes.length === 0) return 0;
  const allVariants = keywords.slice(0, 30).flatMap((k) => expandKeywordVariants(k));
  const conds: string[] = [];
  for (const k of allVariants) {
    const safe = escapeIlike(k);
    if (!safe) continue;
    conds.push(`title.ilike.%${safe}%`);
    conds.push(`raw_description.ilike.%${safe}%`);
  }
  for (const p of cpvPrefixes) conds.push(`cpv_code.ilike.${p}%`);
  if (conds.length === 0) return 0;
  const { count } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .or(`deadline.gt.${nowIso},deadline.is.null`)
    .or(conds.join(","));
  return count ?? 0;
}

async function main() {
  const { count: active } = await supabase
    .from("tenders")
    .select("*", { count: "exact", head: true })
    .or(`deadline.gt.${nowIso},deadline.is.null`);
  const total = active ?? 0;
  console.log(`\nActive tenders in DB: ${total}\n`);
  console.log(
    "category".padEnd(38) +
      "kw".padStart(6) +
      "cpv".padStart(6) +
      "union".padStart(7) +
      "union%".padStart(8)
  );
  console.log("-".repeat(65));

  // Iterate through every offering category — build a synthetic profile
  // that sets JUST that one category and derive retrieval seeds from it.
  for (const cat of OFFERING_CATEGORY_OPTIONS) {
    // Pick the first primary industry that maps this category to construct a valid profile.
    // If none is explicitly declared, fall back to "other".
    const syntheticProfile = parseCompanyProfile(
      JSON.stringify({
        version: 1,
        primaryIndustry: "other",
        offeringCategories: [cat.id],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "",
        manualKeywords: [],
      })
    );

    const keywords = buildRetrievalKeywordSeeds(syntheticProfile);
    const cpvPrefixes = buildBroadRetrievalCpvPrefixes(syntheticProfile);

    const [kw, cpv, union] = await Promise.all([
      countKeywordMatches(keywords),
      countCpvMatches(cpvPrefixes),
      countUnionMatches(keywords, cpvPrefixes),
    ]);

    const pct = total > 0 ? ((union / total) * 100).toFixed(1) + "%" : "-";
    console.log(
      cat.id.padEnd(38) +
        String(kw).padStart(6) +
        String(cpv).padStart(6) +
        String(union).padStart(7) +
        pct.padStart(8)
    );
  }

  console.log("\nAlso per primary industry (no offering categories):");
  for (const pi of PRIMARY_INDUSTRY_OPTIONS) {
    const synthetic = parseCompanyProfile(
      JSON.stringify({
        version: 1,
        primaryIndustry: pi.id,
        offeringCategories: [],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "",
        manualKeywords: [],
      })
    );
    const keywords = buildRetrievalKeywordSeeds(synthetic);
    const cpvPrefixes = buildBroadRetrievalCpvPrefixes(synthetic);
    const [kw, cpv, union] = await Promise.all([
      countKeywordMatches(keywords),
      countCpvMatches(cpvPrefixes),
      countUnionMatches(keywords, cpvPrefixes),
    ]);
    const pct = total > 0 ? ((union / total) * 100).toFixed(1) + "%" : "-";
    console.log(
      ("[" + pi.id + "]").padEnd(38) +
        String(kw).padStart(6) +
        String(cpv).padStart(6) +
        String(union).padStart(7) +
        pct.padStart(8)
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
