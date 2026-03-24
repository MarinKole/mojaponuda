import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { findUserByEmail } from "@/lib/admin-operator";
import { isComplimentaryAgencyEmail } from "@/lib/agency";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/site-url";

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
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
        { error: "Samo admin može kreirati agencijske naloge." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan." }, { status: 400 });
    }

    const admin = createAdminClient();
    const existingUser = await findUserByEmail(email);
    let targetUserId = existingUser?.id ?? null;

    if (!existingUser) {
      const inviteResult = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          account_type: "agency",
          agency_access_status: "active",
          invited_by_admin: true,
        },
        redirectTo: `${getBaseUrl()}/auth/callback?next=/dashboard/agency`,
      });

      if (inviteResult.error || !inviteResult.data.user) {
        return NextResponse.json(
          { error: inviteResult.error?.message || "Ne mogu poslati invite za agencijski nalog." },
          { status: 500 }
        );
      }

      targetUserId = inviteResult.data.user.id;

      const inviteUserMetadata = (inviteResult.data.user.user_metadata ?? {}) as Record<string, unknown>;
      const inviteAppMetadata = (inviteResult.data.user.app_metadata ?? {}) as Record<string, unknown>;
      const invitedUpdateResult = await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...inviteUserMetadata,
          account_type: "agency",
          agency_access_status: "active",
          invited_by_admin: true,
        },
        app_metadata: {
          ...inviteAppMetadata,
          role: "agency",
          agency_managed: true,
        },
      });

      if (invitedUpdateResult.error) {
        return NextResponse.json(
          { error: invitedUpdateResult.error.message || "Ne mogu dovršiti agency metadata provisioning." },
          { status: 500 }
        );
      }
    } else {
      const metadata = (existingUser.user_metadata ?? {}) as Record<string, unknown>;
      const appMetadata = (existingUser.app_metadata ?? {}) as Record<string, unknown>;
      const updateResult = await admin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...metadata,
          account_type: "agency",
          agency_access_status: "active",
          invited_by_admin: true,
        },
        app_metadata: {
          ...appMetadata,
          role: "agency",
          agency_managed: true,
        },
      });

      if (updateResult.error) {
        return NextResponse.json(
          { error: updateResult.error.message || "Ne mogu ažurirati postojeći korisnički račun." },
          { status: 500 }
        );
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Nije moguće odrediti korisnika za agency pristup." },
        { status: 500 }
      );
    }

    const { error: subscriptionError } = await admin.from("subscriptions").upsert(
      {
        user_id: targetUserId,
        lemonsqueezy_customer_id: null,
        lemonsqueezy_subscription_id: null,
        lemonsqueezy_variant_id: "agency",
        status: "active",
        current_period_end: null,
      },
      { onConflict: "user_id" }
    );

    if (subscriptionError) {
      return NextResponse.json(
        { error: `Ne mogu aktivirati agencijski entitlement: ${subscriptionError.message}` },
        { status: 500 }
      );
    }

    const message = existingUser
      ? "Postojećem korisniku je aktiviran agencijski pristup."
      : "Agencijski nalog je kreiran i invite email je poslan.";

    return NextResponse.json({
      message: isComplimentaryAgencyEmail(email)
        ? `${message} Ovo je također complimentary test email.`
        : message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
