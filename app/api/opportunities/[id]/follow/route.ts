import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Check if already following
    const { data: existing } = await supabase
      .from("opportunity_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("opportunity_id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ following: true, message: "Već pratite ovu priliku" });
    }

    const { error } = await supabase
      .from("opportunity_follows")
      .insert({ user_id: user.id, opportunity_id: id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ following: true, message: "Prilika dodana u praćenje" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const { error } = await supabase
      .from("opportunity_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("opportunity_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ following: false, message: "Praćenje uklonjeno" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const outcome: "won" | "lost" | null = body.outcome ?? null;

    const { error } = await supabase
      .from("opportunity_follows")
      .update({ outcome })
      .eq("user_id", user.id)
      .eq("opportunity_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ outcome });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ following: false });

    const { id } = await params;

    const { data } = await supabase
      .from("opportunity_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("opportunity_id", id)
      .maybeSingle();

    return NextResponse.json({ following: !!data });
  } catch {
    return NextResponse.json({ following: false });
  }
}
