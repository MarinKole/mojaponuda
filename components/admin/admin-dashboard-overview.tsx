import { AdminDashboardShellRefined } from "@/components/admin/admin-dashboard-shell-refined";
import type { AdminDashboardData } from "@/lib/admin-dashboard";

interface AdminDashboardOverviewProps {
  data: AdminDashboardData;
  adminEmail: string;
}

export function AdminDashboardOverview({ data, adminEmail }: AdminDashboardOverviewProps) {
  return <AdminDashboardShellRefined data={data} adminEmail={adminEmail} />;
}
