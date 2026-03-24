import { AdminAgenciesShell } from "@/components/admin/admin-agencies-shell";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminAgenciesData } from "@/lib/admin-operator";

export default async function AdminAgenciesPage() {
  await requireAdminUser();
  const data = await loadAdminAgenciesData();

  return <AdminAgenciesShell data={data} />;
}
