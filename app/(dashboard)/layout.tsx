import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getSubscriptionStatus } from "@/lib/subscription";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import type { AgencyClientNavItem } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = isAdminEmail(user.email);
  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = plan.id === "agency";

  // Fetch agency clients for sidebar navigation
  let agencyClients: AgencyClientNavItem[] = [];
  if (isAgency) {
    const { data: agencyData } = await supabase
      .from("agency_clients")
      .select("id, companies (name)")
      .eq("agency_user_id", user.id)
      .order("created_at", { ascending: false });

    agencyClients = (agencyData ?? [])
      .map((row) => {
        const companies = row.companies as { name: string } | null;
        return {
          id: row.id,
          name: companies?.name ?? "Nepoznat klijent",
        };
      });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.09),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f3f7fb_42%,#eef3f8_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:88px_88px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_78%)]" />
      <div className="pointer-events-none absolute -right-24 top-0 h-[280px] w-[280px] rounded-full bg-blue-500/10 blur-[96px] sm:h-[420px] sm:w-[420px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute left-0 top-20 h-[220px] w-[220px] rounded-full bg-sky-300/10 blur-[88px] sm:left-[220px] sm:top-24 sm:h-[320px] sm:w-[320px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[180px] w-[180px] rounded-full bg-slate-900/5 blur-[88px] sm:h-[260px] sm:w-[260px] sm:blur-[120px]" />
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
        isAdmin={isAdmin}
        isAgency={isAgency}
        agencyClients={agencyClients}
      />
      <main className="relative z-10 min-h-screen min-w-0 pt-[4.75rem] lg:pl-[244px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-[1760px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-8 xl:px-12 xl:py-10 2xl:px-14">
          {children}
        </div>
      </main>
    </div>
  );
}
