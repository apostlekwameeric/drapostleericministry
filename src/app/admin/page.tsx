import AdminDashboard from "@/components/admin/AdminDashboard";
import { getBrand } from "@/lib/server/brand";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: `Admin · ${brand.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage() {
  const brand = await getBrand();
  return <AdminDashboard initialBrand={brand} />;
}
