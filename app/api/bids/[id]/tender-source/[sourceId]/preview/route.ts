import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  const { id: bidId, sourceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 404 });
  }

  const { data: bid } = await supabase.from("bids").select("id").eq("id", bidId).single();
  if (!bid) {
    return NextResponse.json({ error: "Ponuda nije pronađena." }, { status: 404 });
  }

  const { data: source } = await supabase
    .from("bid_tender_source_documents")
    .select("id, file_path, company_id, bid_id")
    .eq("id", sourceId)
    .single();

  if (!source || source.company_id !== company.id || source.bid_id !== bidId) {
    return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });
  }

  const { data: signedUrl, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(source.file_path, 3600);

  if (error || !signedUrl) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: "Link za pregled nije dostupan." }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl.signedUrl });
}
