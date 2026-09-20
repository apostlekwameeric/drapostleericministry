import HomeScreen from "@/components/HomeScreen";
import { getBrand } from "@/lib/server/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const brand = await getBrand();
  return <HomeScreen initialBrand={brand} />;
}
