import { AdminPortalLeadsShell } from "@/components/admin/admin-portal-leads-shell";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminPortalLeadsData } from "@/lib/admin-portal-leads";

export default async function AdminPortalLeadsPage() {
  const user = await requireAdminUser();
  const data = await loadAdminPortalLeadsData();

  return <AdminPortalLeadsShell data={data} adminEmail={user.email ?? "admin@mojaponuda.ba"} />;
}
