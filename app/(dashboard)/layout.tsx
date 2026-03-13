import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

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

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
      />
      <main className="min-h-screen pl-[232px] pr-4 pt-4 pb-4">
        <div className="min-h-[calc(100vh-32px)] w-full rounded-3xl bg-white p-8 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
