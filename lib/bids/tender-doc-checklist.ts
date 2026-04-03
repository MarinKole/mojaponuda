import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_TO_VAULT_TYPE_MAP } from "@/lib/vault/constants";
import type { AnalysisResult } from "@/lib/ai/tender-analysis";
import type { GroundedChecklistItem } from "@/lib/ai/tender-documentation-analysis";
import type { BidChecklistItemInsert, BidDocumentInsert, Json } from "@/types/database";

export async function replaceChecklistFromTenderDocumentation(params: {
  supabase: SupabaseClient;
  bidId: string;
  companyId: string;
  sourceDocumentId: string;
  analysis: AnalysisResult;
  groundedItems: GroundedChecklistItem[];
  /** Normalized highlights per item index; null ako nije izračunato */
  highlightRegionsList: Array<Array<{ x: number; y: number; width: number; height: number }> | null>;
}): Promise<{ inserted: number; autoAttached: number }> {
  const {
    supabase,
    bidId,
    companyId,
    sourceDocumentId,
    analysis,
    groundedItems,
    highlightRegionsList,
  } = params;

  const { error: delErr } = await supabase.from("bid_checklist_items").delete().eq("bid_id", bidId);
  if (delErr) {
    throw new Error(`Brisanje stare liste nije uspjelo: ${delErr.message}`);
  }

  const { data: vaultDocs, error: vaultDocsError } = await supabase
    .from("documents")
    .select("id, type, expires_at")
    .eq("company_id", companyId);

  if (vaultDocsError) {
    throw new Error(`Čitanje trezora nije uspjelo: ${vaultDocsError.message}`);
  }

  const extendedAnalysis = {
    ...analysis,
    tender_documentation_grounding: groundedItems.map((g, i) => ({
      source_page: g.source_page,
      verbatim_quote: g.verbatim_quote,
      highlight_regions: highlightRegionsList[i] ?? null,
    })),
  };

  const { error: bidUpdateError } = await supabase
    .from("bids")
    .update({ ai_analysis: extendedAnalysis as unknown as Json })
    .eq("id", bidId);

  if (bidUpdateError) {
    throw new Error(`Spremanje analize nije uspjelo: ${bidUpdateError.message}`);
  }

  const checklistRows: BidChecklistItemInsert[] = groundedItems.map((item, idx) => {
    let docId: string | null = null;
    let status: "missing" | "attached" = "missing";

    if (item.document_type) {
      const targetType = AI_TO_VAULT_TYPE_MAP[item.document_type];
      if (targetType) {
        const match = vaultDocs?.find(
          (document) =>
            document.type === targetType &&
            (!document.expires_at || new Date(document.expires_at) > new Date())
        );
        if (match) {
          docId = match.id;
          status = "attached";
        }
      }
    }

    const regions = highlightRegionsList[idx];
    return {
      bid_id: bidId,
      title: item.name,
      description: item.description,
      status,
      document_id: docId,
      document_type: item.document_type,
      risk_note: item.risk_note || null,
      sort_order: idx,
      tender_source_document_id: sourceDocumentId,
      source_page: item.source_page,
      source_quote: item.verbatim_quote,
      source_highlight_regions: regions?.length ? (regions as unknown as Json) : null,
    };
  });

  if (!checklistRows.length) {
    return { inserted: 0, autoAttached: 0 };
  }

  const { error: insErr } = await supabase.from("bid_checklist_items").insert(checklistRows);
  if (insErr) {
    throw new Error(`Spremanje stavki nije uspjelo: ${insErr.message}`);
  }

  const autoAttachedDocs: BidDocumentInsert[] = checklistRows
    .filter((row) => row.document_id)
    .map((row) => ({
      bid_id: bidId,
      document_id: row.document_id!,
      checklist_item_name: row.title,
      is_confirmed: false,
    }));

  if (autoAttachedDocs.length > 0) {
    const { error: autoAttachError } = await supabase.from("bid_documents").insert(autoAttachedDocs);
    if (autoAttachError) {
      throw new Error(`Automatsko povezivanje dokumenata nije uspjelo: ${autoAttachError.message}`);
    }
  }

  return { inserted: checklistRows.length, autoAttached: autoAttachedDocs.length };
}
