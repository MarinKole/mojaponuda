import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/agency/notes - Create a note for an agency client
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agency_client_id, note } = await request.json();
  if (!agency_client_id || !note?.trim()) {
    return NextResponse.json({ error: "agency_client_id and note are required" }, { status: 400 });
  }

  // Verify ownership
  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id")
    .eq("id", agency_client_id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("agency_client_notes")
    .insert({ agency_client_id, note: note.trim() })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
