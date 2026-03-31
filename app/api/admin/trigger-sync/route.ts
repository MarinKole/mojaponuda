import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runPostSyncPipeline } from "@/sync/post-sync-pipeline";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
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
        { error: "Samo admin može pokrenuti sync." },
        { status: 403 }
      );
    }

    // Execute the post-sync pipeline
    const result = await runPostSyncPipeline();

    // Return success response with results
    return NextResponse.json({
      success: true,
      opportunities_processed: result.opportunities_processed,
      opportunities_published: result.opportunities_published,
      duration_ms: result.duration_ms,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    console.error("Manual sync failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
