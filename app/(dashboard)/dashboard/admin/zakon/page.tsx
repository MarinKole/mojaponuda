import { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin";
import { AdminLegalManager } from "@/components/admin/admin-legal-manager";

export const metadata: Metadata = {
  title: "Zakon i izmjene | Admin",
};

export default async function AdminZakonPage() {
  await requireAdminUser();
  return <AdminLegalManager />;
}
