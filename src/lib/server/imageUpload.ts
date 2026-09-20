export class ImageError extends Error {
  status: number;
  constructor(message: string, status = 415) {
    super(message);
    this.status = status;
  }
}

export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  const head = buf.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}

export type StoredImage = { data: Buffer; mime: string; width: number; height: number };

/** Parse multipart or JSON/base64 without pulling in native image libraries. */
export async function readUploadedImage(
  request: Request,
  maxBytes: number,
): Promise<{ bytes: Buffer | null; fields: Record<string, string> }> {
  const contentType = request.headers.get("content-type") ?? "";
  const fields: Record<string, string> = {};

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ImageError("The upload could not be read. Please try again.", 400);
    }
    let bytes: Buffer | null = null;
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      } else if (value && typeof (value as Blob).arrayBuffer === "function") {
        const blob = value as Blob;
        if (blob.size > maxBytes) {
          throw new ImageError(
            `That file is ${(blob.size / 1024 / 1024).toFixed(1)}MB — please use one under ${Math.round(maxBytes / 1024 / 1024)}MB.`,
            413,
          );
        }
        if (blob.size > 0) bytes = Buffer.from(await blob.arrayBuffer());
      }
    }
    return { bytes, fields };
  }

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && key !== "imageBase64") fields[key] = value;
    }
    const raw = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    if (!raw) return { bytes: null, fields };
    const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length > maxBytes) {
      throw new ImageError(
        `That file is too large — please use one under ${Math.round(maxBytes / 1024 / 1024)}MB.`,
        413,
      );
    }
    return { bytes, fields };
  }

  throw new ImageError("Unsupported upload format.", 400);
}

/**
 * Accept a browser-prepared image as-is. Sharp is optional and never required
 * for Vercel — the client already downscales photos before upload.
 */
export function acceptImage(bytes: Buffer): StoredImage {
  if (bytes.length === 0) throw new ImageError("The file is empty.", 400);
  const mime = sniffMime(bytes);
  if (!mime) {
    throw new ImageError("Please upload a PNG, JPG, WEBP, GIF or SVG image.");
  }
  return { data: bytes, mime, width: 0, height: 0 };
}
