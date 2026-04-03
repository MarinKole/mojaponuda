import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { buildPageTextForPrompt } from "@/lib/tender-doc/extract-text";
import { analyzeTenderDocumentationText } from "@/lib/ai/tender-documentation-analysis";
import { replaceChecklistFromTenderDocumentation } from "@/lib/bids/tender-doc-checklist";
import { computePdfHighlightRegionsNormalized } from "@/lib/tender-doc/pdf-highlight-bounds";
import type { Bid, Company, Tender } from "@/types/database";

type Body = {
  source_document_id: string;
  pages: Array<{ pageNumber: number; text: string }>;
};

function isDirectPdfName(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf");
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
      { error: "Ova funkcija zahtijeva odgovarajući paket." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as Body;
  if (!body?.source_document_id || !Array.isArray(body.pages)) {
    return NextResponse.json({ error: "Neispravan zahtjev." }, { status: 400 });
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

  const { data: source } = await supabase
    .from("bid_tender_source_documents")
    .select("id, file_path, name, company_id, bid_id, mime_type")
    .eq("id", body.source_document_id)
    .single();

  if (!source || source.company_id !== company.id || source.bid_id !== bidId) {
    return NextResponse.json({ error: "Izvorni dokument nije pronađen." }, { status: 404 });
  }

  const nonEmpty = body.pages
    .filter((p) => typeof p.pageNumber === "number" && typeof p.text === "string")
    .map((p) => ({ pageNumber: p.pageNumber, text: p.text.trim() }))
    .filter((p) => p.text.length > 0);

  if (!nonEmpty.length) {
    return NextResponse.json({ error: "OCR tekst je prazan." }, { status: 422 });
  }

  const pageTextForPrompt = buildPageTextForPrompt(nonEmpty);
  const { analysis, groundedItems } = await analyzeTenderDocumentationText({
    tender: bid.tenders,
    pageTextForPrompt,
    pages: nonEmpty,
  });

  const allowPdfHighlights = source.mime_type?.toLowerCase().includes("pdf") || isDirectPdfName(source.name);
  let pdfBuffer: Buffer | null = null;
  if (allowPdfHighlights) {
    const { data: download, error } = await supabase.storage
      .from("documents")
      .download(source.file_path);
    if (!error && download) {
      pdfBuffer = Buffer.from(await download.arrayBuffer());
    }
  }

  const highlightRegionsList: Array<Array<{ x: number; y: number; width: number; height: number }> | null> = [];
  for (const item of groundedItems) {
    if (!allowPdfHighlights || !pdfBuffer) {
      highlightRegionsList.push(null);
      continue;
    }
    try {
      const regions = await computePdfHighlightRegionsNormalized(pdfBuffer, item.source_page, item.verbatim_quote);
      highlightRegionsList.push(regions);
    } catch {
      highlightRegionsList.push(null);
    }
  }

  const { inserted, autoAttached } = await replaceChecklistFromTenderDocumentation({
    supabase,
    bidId,
    companyId: company.id,
    sourceDocumentId: source.id,
    analysis,
    groundedItems,
    highlightRegionsList,
  });

  return NextResponse.json({
    ok: true,
    source_document_id: source.id,
    checklist_items_count: inserted,
    auto_attached: autoAttached,
  });
}

