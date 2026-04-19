/**
 * For a given company, list every active tender whose title/description
 * matches a keyword (default "soft"), and show which were retrieved by
 * pgvector top-K and what LLM score they got. This explains why a tender
 * that clearly fits is missing from Preporučeno.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.argv[2] || "hello@pageitup.com";
const KEYWORD = process.argv[3] || "soft";
const TOP_K = Number(process.argv[4] ?? 200);

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: users } = await (s.auth.admin as any).listUsers();
  const user = users?.users?.find((u: any) => u.email === EMAIL);
  if (!user) throw new Error(`no user for ${EMAIL}`);
  const { data: company } = await (s as any)
    .from("companies")
    .select("id, name, profile_embedding")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) throw new Error("no company");

  // All ACTIVE tenders (deadline in future or null) matching keyword
  const nowIso = new Date().toISOString();
  const { data: matches } = await (s as any)
    .from("tenders")
    .select("id, title, raw_description, deadline, cpv_code")
    .or(`title.ilike.%${KEYWORD}%,raw_description.ilike.%${KEYWORD}%`)
    .or(`deadline.gt.${nowIso},deadline.is.null`);

  const allMatching = (matches ?? []) as Array<{
    id: string;
    title: string;
    raw_description: string | null;
    deadline: string | null;
    cpv_code: string | null;
  }>;
  console.log(`Found ${allMatching.length} active tenders matching "${KEYWORD}"`);

  // Retrieve top-K via pgvector (same call the pipeline uses)
  const { data: retrieved } = await (s as any).rpc("match_tenders_by_embedding", {
    query_embedding: company.profile_embedding,
    match_count: TOP_K,
    now_iso: nowIso,
  });
  const retrievedSet = new Set<string>((retrieved ?? []).map((r: any) => r.id));
  console.log(`pgvector top-${TOP_K}: ${retrievedSet.size} candidates total`);

  // Cache scores for this company
  const { data: scores } = await (s as any)
    .from("tender_relevance")
    .select("tender_id, score, confidence")
    .eq("company_id", company.id);
  const scoreMap = new Map<string, { score: number; confidence: number }>(
    (scores ?? []).map((r: any) => [r.tender_id, { score: r.score, confidence: r.confidence }])
  );

  console.log(`\nFor each match, show: [retrieved?] [score] title`);
  const stats = { retrieved: 0, scored6plus: 0, scored5: 0, scoredBelow5: 0, notScored: 0, notRetrieved: 0 };
  for (const t of allMatching) {
    const inRetrieval = retrievedSet.has(t.id);
    const scoreEntry = scoreMap.get(t.id);
    const scoreLabel = scoreEntry ? String(scoreEntry.score) : "-";
    const flag = inRetrieval ? "✓" : "✗";
    console.log(`  ${flag}  score=${scoreLabel.padEnd(3)}  ${t.title.slice(0, 100)}`);
    if (!inRetrieval) stats.notRetrieved++;
    else {
      stats.retrieved++;
      if (!scoreEntry) stats.notScored++;
      else if (scoreEntry.score >= 6) stats.scored6plus++;
      else if (scoreEntry.score === 5) stats.scored5++;
      else stats.scoredBelow5++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Matching "${KEYWORD}": ${allMatching.length}`);
  console.log(`  In pgvector top-${TOP_K}: ${stats.retrieved}`);
  console.log(`    - score >= 6 (shown in Preporučeno): ${stats.scored6plus}`);
  console.log(`    - score == 5: ${stats.scored5}`);
  console.log(`    - score <= 4: ${stats.scoredBelow5}`);
  console.log(`    - not yet scored: ${stats.notScored}`);
  console.log(`  Outside top-${TOP_K} (missed by retrieval): ${stats.notRetrieved}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
