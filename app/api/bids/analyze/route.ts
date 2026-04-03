import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/database";

/**
 * @deprecated Lista zahtjeva se više ne generiše iz kratkog opisa tendera.
 * Koristi se POST /api/bids/[id]/tender-documentation s učitanom dokumentacijom.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = await request.json();
  const { bid_id } = body;

  if (!bid_id) {
    return NextResponse.json({ error: "bid_id je obavezan." }, { status: 400 });
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 403 });
  }

  const { data: bidRow } = await supabase
    .from("bids")
    .select("company_id")
    .eq("id", bid_id)
    .single();

  if (!bidRow || bidRow.company_id !== company.id) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  return NextResponse.json(
    {
      error:
        "Analiza liste zahtjeva ide isključivo iz učitane tenderske dokumentacije. U radnom prostoru ponude učitajte PDF, DOCX ili ZIP — lista će biti izvučena iz tog dokumenta.",
      code: "TENDER_DOCUMENTATION_REQUIRED",
    },
    { status: 410 }
  );
}
