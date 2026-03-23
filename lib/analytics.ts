import { createClient } from "@/lib/supabase/client";

export async function trackEvent(
  eventName: string,
  metadata: Record<string, any> = {}
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: eventName,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      url: typeof window !== "undefined" ? window.location.href : null,
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}
