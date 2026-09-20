import LiveRoom from "@/components/LiveRoom";
import { bannerSize } from "@/lib/server/banner";
import { getBrand } from "@/lib/server/brand";
import { requestOrigin } from "@/lib/server/origin";
import { activeParticipants, findStream, summarize } from "@/lib/server/room";
import type { StreamSummary } from "@/lib/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const lower = code.toLowerCase();
  const origin = await requestOrigin();
  const brand = await getBrand();

  let title = "Join my live room";
  let hostName = "A host";
  let mode: "video" | "audio" = "video";
  try {
    const stream = await findStream(lower);
    if (stream) {
      title = stream.title;
      hostName = stream.hostName;
      mode = stream.mode === "audio" ? "audio" : "video";
    }
  } catch {
    /* keep defaults */
  }

  const joinUrl = `${origin}/live/${lower}`;
  const image = `${origin}/api/streams/${lower}/banner?format=og`;
  const { width, height } = bannerSize("og");
  const description = `${brand.name} · ${hostName} is live${
    mode === "audio" ? " on audio" : " on video"
  }. Tap to watch, comment, or ask to join the stage. Room code: ${lower.toUpperCase()}`;

  return {
    metadataBase: new URL(origin),
    title: `🔴 ${title} · ${brand.name}`,
    description,
    openGraph: {
      type: "website",
      url: joinUrl,
      siteName: brand.name,
      title: `🔴 LIVE — ${title}`,
      description,
      images: [{ url: image, width, height, alt: title, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `🔴 LIVE — ${title}`,
      description,
      images: [image],
    },
  };
}

export default async function LivePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let initialStream: StreamSummary | null = null;
  try {
    const stream = await findStream(code);
    if (stream) {
      const people = await activeParticipants(stream.id);
      initialStream = summarize(stream, people);
    }
  } catch {
    initialStream = null;
  }

  const brand = await getBrand();
  return (
    <LiveRoom
      code={code.toLowerCase()}
      initialStream={initialStream}
      initialBrand={brand}
    />
  );
}
