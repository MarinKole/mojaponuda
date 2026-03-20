import { AdminCrmShell } from "@/components/admin/admin-crm-shell";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminDashboardData } from "@/lib/admin-dashboard";

export default async function AdminCrmPage() {
  await requireAdminUser();
  const data = await loadAdminDashboardData();

  return <AdminCrmShell data={data} />;
}
