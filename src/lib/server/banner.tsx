import { ImageResponse } from "next/og";
import QRCode from "qrcode";

export type BannerFormat = "og" | "story" | "square";

export type BannerInput = {
  title: string;
  hostName: string;
  code: string;
  mode: "video" | "audio";
  url: string;
  status: "live" | "ended";
  format: BannerFormat;
  tagline?: string | null;
  scheduledFor?: string | null;
  phase?: "prelive" | "onair";
  coverDataUrl?: string | null;
  brandName: string;
  brandTagline: string;
  brandLogoDataUrl?: string | null;
};

const SIZES: Record<BannerFormat, { width: number; height: number }> = {
  og: { width: 1200, height: 630 },
  story: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};

export function bannerSize(format: BannerFormat) {
  return SIZES[format];
}

export function parseFormat(raw: string | null): BannerFormat {
  return raw === "story" || raw === "square" ? raw : "og";
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

async function qrDataUrl(url: string) {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 480,
      errorCorrectionLevel: "M",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

export async function renderBanner(input: BannerInput) {
  const { width, height } = SIZES[input.format];
  const wide = input.format === "og";
  const qr = await qrDataUrl(input.url);
  const prettyUrl = input.url.replace(/^https?:\/\//, "");

  const pad = wide ? 64 : 72;
  const qrSize = wide ? 176 : 208;
  const qrCard = qrSize + (wide ? 32 : 40);
  const gap = wide ? 32 : 28;
  const columnWidth = width - pad * 2 - qrCard - gap;
  const titleSize = input.title.length > 44 ? (wide ? 56 : 62) : wide ? 74 : 80;
  const cover = input.coverDataUrl ?? null;
  const badge =
    input.status === "ended"
      ? "REPLAY"
      : input.phase === "prelive"
        ? "● STARTING SOON"
        : "● LIVE NOW";
  const badgeBg =
    input.status === "ended"
      ? "rgba(255,255,255,0.15)"
      : input.phase === "prelive"
        ? "#7c3aed"
        : "#e11d48";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #1b0620 0%, #0a0a0a 45%, #2a0713 100%)",
          padding: pad,
          fontFamily: "sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {cover && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: -pad,
              left: -pad,
              width,
              height,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              width={width}
              height={height}
              alt=""
              style={{ width, height, objectFit: "cover" }}
            />
          </div>
        )}
        {cover && (
          <div
            style={{
              position: "absolute",
              top: -pad,
              left: -pad,
              width,
              height,
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(8,4,12,0.78) 0%, rgba(8,4,12,0.62) 42%, rgba(8,4,12,0.94) 100%)",
            }}
          />
        )}
        {cover && (
          <div
            style={{
              position: "absolute",
              top: -pad,
              left: -pad,
              width,
              height,
              display: "flex",
              background: wide
                ? "linear-gradient(90deg, rgba(8,4,12,0.85) 0%, rgba(8,4,12,0.45) 55%, rgba(8,4,12,0.15) 100%)"
                : "linear-gradient(90deg, rgba(8,4,12,0.7) 0%, rgba(8,4,12,0.3) 70%, rgba(8,4,12,0.15) 100%)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(217,70,239,0.40), rgba(0,0,0,0))",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -160,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(244,63,94,0.36), rgba(0,0,0,0))",
            display: "flex",
          }}
        />

        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 68,
              height: 68,
              borderRadius: 18,
              overflow: "hidden",
              background: input.brandLogoDataUrl
                ? "rgba(255,255,255,0.92)"
                : "linear-gradient(135deg, #fbbf24, #d946ef, #f43f5e)",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            {input.brandLogoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={input.brandLogoDataUrl}
                width={68}
                height={68}
                alt=""
                style={{ width: 68, height: 68, objectFit: "contain" }}
              />
            ) : (
              monogram(input.brandName)
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginRight: 6 }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>
              {input.brandName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {input.brandTagline}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 9999,
              background: badgeBg,
              fontSize: 23,
              fontWeight: 800,
              letterSpacing: 2,
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.12)",
              fontSize: 23,
              whiteSpace: "nowrap",
            }}
          >
            {input.mode === "video" ? "Video room" : "Audio room"}
          </div>
        </div>

        {/* body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginTop: wide ? 0 : 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.08,
              maxWidth: wide ? 880 : "100%",
            }}
          >
            {input.title}
          </div>
          {input.tagline && (
            <div
              style={{
                display: "flex",
                fontSize: wide ? 34 : 36,
                color: "#fbcfe8",
                maxWidth: wide ? 860 : "100%",
                lineHeight: 1.25,
              }}
            >
              {input.tagline}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: wide ? 30 : 32,
              color: "#e9d5ff",
              maxWidth: wide ? 820 : "100%",
            }}
          >
            {input.scheduledFor
              ? `${input.hostName} · ${input.scheduledFor}`
              : `${input.hostName} is streaming · join with video, audio, or just comment`}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: columnWidth,
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 21,
                letterSpacing: 4,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              ROOM CODE
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 26px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.1)",
                border: "2px solid rgba(217,70,239,0.6)",
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: 7,
                whiteSpace: "nowrap",
              }}
            >
              {input.code.toUpperCase()}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "rgba(255,255,255,0.75)",
                width: columnWidth,
                lineHeight: 1.3,
              }}
            >
              {prettyUrl}
            </div>
          </div>

          {qr && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: qrCard,
                padding: wide ? 16 : 20,
                borderRadius: 24,
                background: "white",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={qrSize} height={qrSize} alt="Join QR code" />
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#0a0a0a",
                }}
              >
                SCAN TO JOIN
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { width, height },
  );
}
