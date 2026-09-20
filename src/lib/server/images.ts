export class ImageError extends Error {
  status: number;
  constructor(message: string, status = 415) {
    super(message);
    this.status = status;
  }
}

async function loadSharp(): Promise<typeof import("sharp").default> {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    throw new ImageError(
      "Image processing is not available on this host. Upload a smaller JPG or PNG, or check that `sharp` is installed for linux-x64.",
      500,
    );
  }
}

export type NormalizedImage = {
  data: Buffer;
  mime: string;
  width: number;
  height: number;
};

/** Detect the real format from magic bytes — never trust the browser's MIME type. */
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
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  if (
    (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
    (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
  ) {
    return "image/tiff";
  }
  const ftyp = buf.subarray(4, 12).toString("ascii");
  if (ftyp.startsWith("ftyp")) {
    const brand = ftyp.slice(4);
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
    return "image/heic";
  }
  const head = buf.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}

type Options = {
  maxEdge: number;
  /** "png" keeps transparency (logos); "auto" picks jpeg for photos, png when alpha exists. */
  output: "png" | "auto";
  /** Keep animated GIFs untouched (banners). */
  keepGif?: boolean;
};

/**
 * Turn whatever the user uploaded into a predictable, reasonably small bitmap.
 * Handles EXIF rotation, SVG rasterisation and oversized files.
 */
export async function normalizeImage(input: Buffer, opts: Options): Promise<NormalizedImage> {
  if (input.length === 0) throw new ImageError("The file is empty.", 400);
  const sharp = await loadSharp();

  const sniffed = sniffMime(input);
  if (sniffed === "image/heic") {
    throw new ImageError(
      "HEIC photos are not supported here. Please export the logo as PNG or JPG and upload again.",
    );
  }

  if (sniffed === "image/gif" && opts.keepGif) {
    const meta = await sharp(input, { animated: true }).metadata().catch(() => null);
    return {
      data: input,
      mime: "image/gif",
      width: meta?.width ?? 0,
      height: meta?.pageHeight ?? meta?.height ?? 0,
    };
  }

  let base = sharp(input, { failOn: "none", limitInputPixels: 80_000_000 });
  let meta;
  try {
    meta = await base.metadata();
  } catch {
    throw new ImageError(
      "That file could not be read as an image. Please use a PNG, JPG, WEBP, GIF or SVG file.",
    );
  }

  // Rasterise vector logos at a useful resolution instead of their tiny intrinsic size.
  if (meta.format === "svg") {
    const longest = Math.max(meta.width ?? 100, meta.height ?? 100);
    const density = Math.min(2400, Math.max(72, (72 * opts.maxEdge) / longest));
    base = sharp(input, { density, failOn: "none", limitInputPixels: 80_000_000 });
  }

  const hasAlpha = Boolean(meta.hasAlpha) || meta.format === "svg";
  const useJpeg = opts.output === "auto" && !hasAlpha;

  let pipeline = base
    .rotate()
    .resize(opts.maxEdge, opts.maxEdge, { fit: "inside", withoutEnlargement: true });

  pipeline = useJpeg
    ? pipeline.jpeg({ quality: 86, mozjpeg: true })
    : pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });

  try {
    const out = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      data: out.data,
      mime: useJpeg ? "image/jpeg" : "image/png",
      width: out.info.width,
      height: out.info.height,
    };
  } catch {
    throw new ImageError(
      "We could not process that image. Try saving it as PNG or JPG and upload again.",
    );
  }
}

/** Pull image bytes out of either a multipart form or a JSON body with base64. */
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
