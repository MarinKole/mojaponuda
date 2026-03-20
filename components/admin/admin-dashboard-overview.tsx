import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import type { AdminDashboardData } from "@/lib/admin-dashboard";

interface AdminDashboardOverviewProps {
  data: AdminDashboardData;
  adminEmail: string;
}

export function AdminDashboardOverview({ data, adminEmail }: AdminDashboardOverviewProps) {
  return <AdminDashboardShell data={data} adminEmail={adminEmail} />;
}
