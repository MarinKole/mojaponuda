import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { extractDocumentText, buildPageTextForPrompt } from "@/lib/tender-doc/extract-text";
import { analyzeTenderDocumentationText } from "@/lib/ai/tender-documentation-analysis";
import { replaceChecklistFromTenderDocumentation } from "@/lib/bids/tender-doc-checklist";
import { computePdfHighlightRegionsNormalized } from "@/lib/tender-doc/pdf-highlight-bounds";
import type { Bid, Company, Tender } from "@/types/database";

const MAX_BYTES = 45 * 1024 * 1024;

function isDirectPdf(mime: string, name: string): boolean {
  const m = mime.toLowerCase();
  const n = name.toLowerCase();
  return m.includes("pdf") || n.endsWith(".pdf");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: bidId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) {
    return NextResponse.json({ error: "Potrebna je pretplata." }, { status: 403 });
  }

  const canUseTenderDocAi = plan.limits.features.advancedAnalysis || plan.id === "starter";
  if (!canUseTenderDocAi) {
    return NextResponse.json(
      { error: "Ova funkcija zahtijeva odgovarajući paket (npr. Puni paket ili priprema s Osnovnim uz otključani tender)." },
      { status: 403 }
    );
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 404 });
  }

  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", bidId)
    .single();

  const bid = bidData as unknown as (Bid & { tenders: Tender }) | null;
  if (!bid || bid.company_id !== company.id) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nedostaje datoteka." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Datoteka je prevelika (maks. oko 45 MB). Pokušajte sa manjim PDF-om ili podijelite dokumentaciju." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${company.id}/tender-sources/${bidId}/${Date.now()}_${sanitizedFilename}`;

  const { data: oldSources } = await supabase
    .from("bid_tender_source_documents")
    .select("id, file_path")
    .eq("bid_id", bidId);

  for (const old of oldSources ?? []) {
    await supabase.storage.from("documents").remove([old.file_path]);
    await supabase.from("bid_tender_source_documents").delete().eq("id", old.id);
  }

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: mimeType || undefined,
    upsert: false,
  });

  if (uploadError) {
    console.error("Tender doc upload error:", uploadError);
    return NextResponse.json({ error: "Upload nije uspio." }, { status: 500 });
  }

  const { data: sourceRow, error: sourceInsErr } = await supabase
    .from("bid_tender_source_documents")
    .insert({
      bid_id: bidId,
      company_id: company.id,
      name: file.name,
      file_path: storagePath,
      mime_type: mimeType,
    })
    .select("id")
    .single();

  if (sourceInsErr || !sourceRow) {
    await supabase.storage.from("documents").remove([storagePath]);
    console.error(sourceInsErr);
    return NextResponse.json({ error: "Spremanje zapisa dokumenta nije uspjelo." }, { status: 500 });
  }

  try {
    const { pages } = await extractDocumentText({
      buffer,
      mimeType,
      filename: file.name,
    });

    const nonEmpty = pages.filter((p) => p.text.trim().length > 0);
    if (!nonEmpty.length) {
      // Signal client-side OCR flow (scanned PDFs are common).
      return NextResponse.json(
        {
          ok: false,
          code: "OCR_REQUIRED",
          source_document_id: sourceRow.id,
          message:
            "Dokument izgleda kao sken bez tekstualnog sloja. Pokrećem OCR u browseru i nastavljam analizu…",
        },
        { status: 409 }
      );
    }

    const pageTextForPrompt = buildPageTextForPrompt(nonEmpty);
    const { analysis, groundedItems } = await analyzeTenderDocumentationText({
      tender: bid.tenders,
      pageTextForPrompt,
      pages: nonEmpty,
    });

    const allowPdfHighlights = isDirectPdf(mimeType, file.name);
    const highlightRegionsList: Array<Array<{ x: number; y: number; width: number; height: number }> | null> =
      [];

    for (const item of groundedItems) {
      if (!allowPdfHighlights) {
        highlightRegionsList.push(null);
        continue;
      }
      try {
        const regions = await computePdfHighlightRegionsNormalized(buffer, item.source_page, item.verbatim_quote);
        highlightRegionsList.push(regions);
      } catch {
        highlightRegionsList.push(null);
      }
    }

    const { inserted, autoAttached } = await replaceChecklistFromTenderDocumentation({
      supabase,
      bidId,
      companyId: company.id,
      sourceDocumentId: sourceRow.id,
      analysis,
      groundedItems,
      highlightRegionsList,
    });

    return NextResponse.json({
      ok: true,
      source_document_id: sourceRow.id,
      checklist_items_count: inserted,
      auto_attached: autoAttached,
    });
  } catch (err) {
    console.error("Tender documentation analysis error:", err);
    await supabase.from("bid_tender_source_documents").delete().eq("id", sourceRow.id);
    await supabase.storage.from("documents").remove([storagePath]);
    const message = err instanceof Error ? err.message : "Analiza nije uspjela.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
