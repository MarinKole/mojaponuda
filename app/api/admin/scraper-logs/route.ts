import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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
        { error: "Samo admin može pristupiti logovima." },
        { status: 403 }
      );
    }

    // Fetch recent scraper logs
    const { data: logs, error } = await supabase
      .from("scraper_log")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    console.error("Failed to fetch logs:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
