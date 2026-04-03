import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bidId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  // Verify access
  const { data: bid } = await supabase
    .from("bids")
    .select("id, company_id")
    .eq("id", bidId)
    .single();

  if (!bid) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", bid.company_id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Nemate pristup." }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: upload } = await supabaseAdmin
    .from("tender_doc_uploads")
    .select("extracted_text, page_count, status")
    .eq("bid_id", bidId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!upload || upload.status !== "ready") {
    return NextResponse.json(
      { error: "Dokumentacija nije dostupna." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    text: upload.extracted_text,
    page_count: upload.page_count,
  });
}
