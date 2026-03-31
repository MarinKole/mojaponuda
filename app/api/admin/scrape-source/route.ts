import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runScraperById, SCRAPER_SOURCES } from "@/sync/scrapers/scraper-registry";
import { filterOpportunities } from "@/sync/scrapers/quality-filter";
import { processOpportunitiesWithHashing } from "@/sync/scrapers/content-hasher";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "@/sync/opportunity-scorer";
import { generateOpportunityContent, generateLegalSummary } from "@/sync/ai-content-generator";
import type { ScrapedOpportunity } from "@/sync/scrapers/types";

export const maxDuration = 300;

/**
 * API endpoint za individualno scrapanje izvora
 * POST /api/admin/scrape-source
 * Body: { sourceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Morate biti prijavljeni." }, { status: 401 });
    }

    // Check user has admin role
    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Samo admin može pokrenuti scraper." },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { sourceId } = body;

    if (!sourceId) {
      return NextResponse.json({ error: "sourceId je obavezan." }, { status: 400 });
    }

    // Verify source exists
    const source = SCRAPER_SOURCES.find((s) => s.id === sourceId);
    if (!source) {
      return NextResponse.json({ error: "Nepoznat izvor." }, { status: 404 });
    }

    const start = Date.now();
    const errors: string[] = [];
    let itemsFound = 0;
    let itemsNew = 0;
    let itemsSkipped = 0;
    let itemsFiltered = 0;

    // Run the scraper
    const results = await runScraperById(sourceId);

    // Process results based on category
    if (source.category === "opportunities") {
      // Collect all opportunities
      const allOpportunities: ScrapedOpportunity[] = [];
      for (const result of results) {
        if ("error" in result && result.error) {
          errors.push(`${result.source}: ${result.error}`);
        }
        if ("items" in result) {
          allOpportunities.push(...result.items);
        }
      }

      itemsFound = allOpportunities.length;

      // Apply quality filtering
      const filterResult = filterOpportunities(allOpportunities);
      const qualityOpportunities = filterResult.filtered;
      itemsFiltered = filterResult.stats.failed;

      // Fetch existing content hashes
      const existingHashMap = new Map<string, string>();
      if (qualityOpportunities.length > 0) {
        const externalIds = qualityOpportunities.map((o) => o.external_id);
        const { data: existingOpps } = await supabase
          .from("opportunities")
          .select("external_id, content_hash")
          .in("external_id", externalIds);

        if (existingOpps) {
          for (const opp of existingOpps) {
            if (opp.content_hash) {
              existingHashMap.set(opp.external_id, opp.content_hash);
            }
          }
        }
      }

      // Process with content hashing
      const processedOpportunities = processOpportunitiesWithHashing(
        qualityOpportunities,
        existingHashMap
      );

      // Insert/update opportunities
      for (const item of processedOpportunities) {
        try {
          // Skip duplicates and unchanged
          if (item.is_duplicate || item.change_status === "UNCHANGED") {
            itemsSkipped++;
            continue;
          }

          const score = scoreOpportunity(item);
          if (score < PUBLISH_THRESHOLD) {
            itemsSkipped++;
            continue;
          }

          // Check if exists
          const { data: existing } = await supabase
            .from("opportunities")
            .select("id, quality_score, content_hash")
            .eq("external_id", item.external_id)
            .maybeSingle();

          if (existing) {
            // Update if changed or score improved
            if (item.change_status === "UPDATED" || score > (existing.quality_score ?? 0)) {
              await supabase
                .from("opportunities")
                .update({
                  quality_score: score,
                  content_hash: item.content_hash,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            }
            itemsSkipped++;
            continue;
          }

          // Generate AI content
          const aiContent = await generateOpportunityContent(
            item.title,
            item.issuer,
            item.description,
            item.requirements,
            item.value,
            item.deadline,
            "poticaj"
          );

          const id = crypto.randomUUID();
          const slug = generateSlug(item.title, "poticaj", id);

          const { error: insertError } = await supabase.from("opportunities").insert({
            id,
            type: "poticaj",
            slug,
            title: item.title,
            issuer: item.issuer,
            category: item.category,
            description: item.description,
            requirements: item.requirements,
            value: item.value,
            deadline: item.deadline,
            location: item.location,
            source_url: item.source_url,
            eligibility_signals: item.eligibility_signals,
            external_id: item.external_id,
            content_hash: item.content_hash,
            quality_score: score,
            published: score >= PUBLISH_THRESHOLD,
            status: "active",
            seo_title: aiContent?.seo_title ?? item.title.slice(0, 60),
            seo_description: aiContent?.seo_description ?? null,
            ai_summary: aiContent?.ai_summary ?? null,
            ai_who_should_apply: aiContent?.ai_who_should_apply ?? null,
            ai_difficulty: aiContent?.ai_difficulty ?? null,
            ai_risks: aiContent?.ai_risks ?? null,
            ai_competition: aiContent?.ai_competition ?? null,
            ai_generated_at: aiContent ? new Date().toISOString() : null,
          });

          if (!insertError) {
            itemsNew++;
          } else {
            errors.push(`Insert error: ${insertError.message}`);
          }
        } catch (err) {
          errors.push(`opportunity ${item.external_id}: ${String(err)}`);
        }
      }
    } else if (source.category === "legal") {
      // Process legal updates
      for (const result of results) {
        if ("error" in result && result.error) {
          errors.push(`${result.source}: ${result.error}`);
        }
        if ("items" in result) {
          itemsFound += result.items.length;

          for (const item of result.items) {
            try {
              const { data: existing } = await supabase
                .from("legal_updates")
                .select("id")
                .eq("external_id", item.external_id)
                .maybeSingle();

              if (existing) {
                itemsSkipped++;
                continue;
              }

              // Generate AI summary if missing
              const summary =
                item.summary ?? (await generateLegalSummary(item.title, item.type, item.summary));

              await supabase.from("legal_updates").insert({
                type: item.type,
                title: item.title,
                summary,
                source: item.source,
                source_url: item.source_url,
                published_date: item.published_date,
                relevance_tags: item.relevance_tags,
                external_id: item.external_id,
              });

              itemsNew++;
            } catch (err) {
              errors.push(`legal ${item.external_id}: ${String(err)}`);
            }
          }
        }
      }
    }

    // Log scraper run
    await supabase.from("scraper_log").insert({
      source: `manual-${sourceId}`,
      items_found: itemsFound,
      items_new: itemsNew,
      items_skipped: itemsSkipped,
      error: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
    });

    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      sourceId,
      sourceName: source.name,
      itemsFound,
      itemsNew,
      itemsSkipped,
      itemsFiltered,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    console.error("Scraper failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
