/**
 * Debug: for a given company email, run the full recommendation pipeline
 * step-by-step and print what each stage returns.
 *
 *   1. Company row + profile_embedding presence
 *   2. pgvector top-K retrieval (what did cosine similarity return?)
 *   3. tender_relevance cache state
 *   4. If cache empty: call LLM directly on the first N retrieved tenders
 *      and print scores, so we can see what the LLM thinks the fit is.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const EMAIL = process.argv[2] || "hello@pageitup.com";
const TOP_K = Number(process.argv[3] ?? 30);

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const { data: users } = await (s.auth.admin as any).listUsers();
  const user = users?.users?.find((u: any) => u.email === EMAIL);
  if (!user) throw new Error(`No auth user for ${EMAIL}`);

  const { data: company } = await (s as any)
    .from("companies")
    .select("id, name, profile_text, profile_embedding, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) throw new Error("no company");

  console.log("=== COMPANY ===");
  console.log(company.id, company.name);
  console.log("profile_text:\n", company.profile_text);
  console.log("embedding dims:", company.profile_embedding ? "present" : "MISSING");

  if (!company.profile_embedding) return;

  // Step 1: pgvector retrieval via RPC
  console.log(`\n=== pgvector top-${TOP_K} (match_tenders_by_embedding) ===`);
  const { data: matches, error: rpcErr } = await (s as any).rpc("match_tenders_by_embedding", {
    query_embedding: company.profile_embedding,
    match_count: TOP_K,
    now_iso: new Date().toISOString(),
  });
  if (rpcErr) {
    console.error("RPC error:", rpcErr.message);
    return;
  }
  if (!matches?.length) {
    console.log("RPC returned 0 rows. Possible causes: no active tenders have embeddings, or RPC not installed.");
    // Fallback sanity check — count active tenders with embedding
    const { count } = await (s as any)
      .from("tenders")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null);
    console.log("Active tenders with embedding (approx):", count);
    return;
  }
  console.log(`Got ${matches.length} candidates.`);
  const candidateIds = (matches as any[]).map((m) => m.id);
  const { data: tenderRows } = await (s as any)
    .from("tenders")
    .select("id, title, raw_description, cpv_code")
    .in("id", candidateIds);
  const byId = new Map<string, any>((tenderRows ?? []).map((r: any) => [r.id, r]));
  for (const m of (matches as any[]).slice(0, 15)) {
    const t = byId.get(m.id);
    console.log(
      `  sim=${(m.similarity ?? 0).toFixed(3)}  ${m.id.slice(0, 8)}  ${String(t?.title ?? "").slice(0, 90)}`
    );
  }

  // Step 2: LLM scoring on first 15 with REAL title+description
  console.log("\n=== LLM scoring (first 15) ===");
  const top = (matches as any[]).slice(0, 15);
  let countMaybeOrBetter = 0;
  for (const m of top) {
    const t = byId.get(m.id);
    if (!t) continue;
    const prompt = [
      {
        role: "system" as const,
        content:
          "Ti si procjenitelj relevantnosti za javne nabavke u BiH. Firmi se daje profil i jedan tender. Ocijeni od 1-10 koliko firma realno može ispuniti zahtjeve tendera. 1-3 = nerelevantno, 4-5 = graničan slučaj, 6-7 = firma može konkurirati, 8-10 = idealno podudaranje. Vrati SAMO jedan broj.",
      },
      {
        role: "user" as const,
        content: `PROFIL FIRME:\n${company.profile_text}\n\nTENDER:\nNaslov: ${t.title}\nCPV: ${t.cpv_code ?? "-"}\nOpis: ${String(t.raw_description ?? "").slice(0, 1200)}`,
      },
    ];
    try {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: prompt,
        max_tokens: 5,
        temperature: 0,
      });
      const raw = r.choices[0]?.message?.content?.trim() ?? "?";
      const n = Number(raw.match(/\d+/)?.[0] ?? 0);
      if (n >= 5) countMaybeOrBetter++;
      console.log(`  score=${String(n).padEnd(3)}  ${String(t.title).slice(0, 95)}`);
    } catch (e: any) {
      console.log(`  LLM error:`, e?.message);
    }
  }
  console.log(`\nOf first 15: ${countMaybeOrBetter} had score >= 5`);

  // Step 3: cache state
  const { data: cache } = await (s as any)
    .from("tender_relevance")
    .select("score")
    .eq("company_id", company.id);
  console.log(
    `\ntender_relevance rows for this company: ${cache?.length ?? 0}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
