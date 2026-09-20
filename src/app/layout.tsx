import { getBrand } from "@/lib/server/brand";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: `${brand.name} — ${brand.tagline}`,
    description: `Watch ${brand.name} live. Join the service with video or audio, and share the word in real time.`,
    applicationName: brand.name,
    icons: { icon: `/api/brand/logo?v=${brand.logoVersion || 1}` },
  };
}

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
