import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { isComplimentaryAgencyEmail } from "@/lib/agency";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Morate biti prijavljeni." }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Samo admin može deaktivirati agencijski pristup." },
        { status: 403 }
      );
    }

    const { userId } = await context.params;
    const admin = createAdminClient();
    const userResult = await admin.auth.admin.getUserById(userId);

    if (userResult.error || !userResult.data.user) {
      return NextResponse.json(
        { error: userResult.error?.message || "Ne mogu pronaći korisnika." },
        { status: 404 }
      );
    }

    if (isComplimentaryAgencyEmail(userResult.data.user.email)) {
      return NextResponse.json(
        { error: "Complimentary test nalog se ne deaktivira iz admin panela." },
        { status: 400 }
      );
    }

    const metadata = (userResult.data.user.user_metadata ?? {}) as Record<string, unknown>;
    const appMetadata = (userResult.data.user.app_metadata ?? {}) as Record<string, unknown>;
    const updateResult = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...metadata,
        account_type: "agency",
        agency_access_status: "deactivated",
      },
      app_metadata: {
        ...appMetadata,
        role: "agency",
        agency_managed: false,
      },
    });

    if (updateResult.error) {
      return NextResponse.json(
        { error: updateResult.error.message || "Ne mogu ažurirati metadata status korisnika." },
        { status: 500 }
      );
    }

    const { error: subscriptionError } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        lemonsqueezy_variant_id: "agency",
        status: "cancelled",
        current_period_end: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (subscriptionError) {
      return NextResponse.json(
        { error: `Ne mogu deaktivirati agency entitlement: ${subscriptionError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Agencijski pristup je deaktiviran." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
