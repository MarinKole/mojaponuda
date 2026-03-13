import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { SubscriptionClientPage } from "./subscription-client-page";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const status = await getSubscriptionStatus(user.id, user.email);

  return <SubscriptionClientPage initialStatus={status} />;
}

