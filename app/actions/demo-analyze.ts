"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface DemoTenderResult {
  found: boolean;
  title?: string;
  contracting_authority?: string | null;
  deadline?: string | null;
  estimated_value?: number | null;
  contract_type?: string | null;
  procedure_type?: string | null;
}

/**
 * Extract a numeric portal_id from various EJN URL formats:
 * - https://www.ejn.gov.ba/Notice/2660882
 * - https://next.ejn.gov.ba/advertisement/procurement/2660882
 * - https://ejn.gov.ba/Announcement/ProcurementNoticeView/2660882
 * - Or just a raw number like "2660882"
 */
function extractPortalId(input: string): string | null {
  const trimmed = input.trim();

  // Try to extract last numeric segment from a URL-like string
  const urlMatch = trimmed.match(/(\d{4,})(?:\s*$|[/?#])/);
  if (urlMatch) return urlMatch[1];

  // Fallback: try the very end of the string for a number
  const endMatch = trimmed.match(/(\d{4,})\s*$/);
  if (endMatch) return endMatch[1];

  return null;
}

export async function demoAnalyzeTender(input: string): Promise<DemoTenderResult> {
  const portalId = extractPortalId(input);

  if (!portalId) {
    return { found: false };
  }

  const supabase = createAdminClient();

  const { data: tender } = await supabase
    .from("tenders")
    .select("title, contracting_authority, deadline, estimated_value, contract_type, procedure_type")
    .eq("portal_id", portalId)
    .maybeSingle();

  if (!tender) {
    return { found: false };
  }

  return {
    found: true,
    title: tender.title,
    contracting_authority: tender.contracting_authority,
    deadline: tender.deadline,
    estimated_value: tender.estimated_value,
    contract_type: tender.contract_type,
    procedure_type: tender.procedure_type,
  };
}
