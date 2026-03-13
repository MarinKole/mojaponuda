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
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Full-height blue sidebar — no margin, no rounding */}
      <DashboardSidebar
        userEmail={user.email ?? ""}
        companyName={company?.name}
      />
      {/* White content panel with diagonal left edge overlapping sidebar */}
      <main
        className="relative z-10 min-h-screen flex-1"
        style={{
          marginLeft: "160px",
          clipPath: "polygon(40px 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        <div className="min-h-screen bg-white px-14 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
