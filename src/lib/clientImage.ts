"use client";

export type PreparedImage = {
  /** Bytes ready to upload (downscaled when the browser could decode the file). */
  blob: Blob;
  /** Object URL for previewing. Caller must revoke it. */
  previewUrl: string;
  width: number;
  height: number;
  /** True when the browser could not decode it and we are sending the original bytes. */
  original: boolean;
  mime: string;
};

export type UploadOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function sniff(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...Array.from(bytes.subarray(from, to)));
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if (ascii(4, 8) === "ftyp") return ascii(8, 12).startsWith("avif") ? "image/avif" : "image/heic";
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return "image/svg+xml";
  }
  return null;
}

function mimeFromName(name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    jfif: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    heic: "image/heic",
    heif: "image/heic",
    avif: "image/avif",
    tif: "image/tiff",
    tiff: "image/tiff",
  };
  return map[ext] ?? null;
}

async function readBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    try {
      return await file.arrayBuffer();
    } catch {
      /* fall through to FileReader */
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsArrayBuffer(file);
  });
}

type Drawable = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };

async function decode(blob: Blob): Promise<Drawable | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.(),
        };
      }
    } catch {
      /* try <img> below (handles HEIC on Safari and odd formats) */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    const loaded = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = url;
    const ok = await loaded;
    if (!ok || img.naturalWidth === 0) {
      URL.revokeObjectURL(url);
      return null;
    }
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Read the picked file straight into memory (so a vanished file handle cannot
 * break the upload later), decode it, and downscale it for upload.
 */
export async function prepareImage(
  file: File,
  opts: { maxEdge: number; preferJpeg?: boolean; keepGif?: boolean },
): Promise<PreparedImage> {
  const buffer = await readBytes(file);
  const bytes = new Uint8Array(buffer);
  const mime = sniff(bytes) ?? (file.type || mimeFromName(file.name) || "application/octet-stream");
  const raw = new Blob([buffer], { type: mime });

  const passthrough = (): PreparedImage => ({
    blob: raw,
    previewUrl: URL.createObjectURL(raw),
    width: 0,
    height: 0,
    original: true,
    mime,
  });

  if (mime === "image/svg+xml") return passthrough();
  if (mime === "image/gif" && opts.keepGif) return passthrough();

  const drawable = await decode(raw);
  if (!drawable) return passthrough();

  try {
    const scale = Math.min(1, opts.maxEdge / Math.max(drawable.width, drawable.height));
    const width = Math.max(1, Math.round(drawable.width * scale));
    const height = Math.max(1, Math.round(drawable.height * scale));

    // Already small and a web-friendly format: keep the original bytes intact.
    if (scale === 1 && raw.size < 350_000 && ["image/png", "image/jpeg", "image/webp"].includes(mime)) {
      return { ...passthrough(), width, height, original: false };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return passthrough();
    ctx.drawImage(drawable.source, 0, 0, width, height);

    let out: Blob | null = null;
    if (opts.preferJpeg) out = await toBlob(canvas, "image/jpeg", 0.88);
    if (!out || out.type !== "image/jpeg") out = await toBlob(canvas, "image/png");
    if (!out) return passthrough();

    return {
      blob: out,
      previewUrl: URL.createObjectURL(out),
      width,
      height,
      original: false,
      mime: out.type,
    };
  } finally {
    drawable.cleanup();
  }
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("encode failed"));
    reader.readAsDataURL(blob);
  });
}

function describeStatus(status: number) {
  if (status === 413) return "The image is too large for the server. Try a smaller file.";
  if (status === 401 || status === 403) return "You are not allowed to do that.";
  if (status === 404) return "The upload address was not found (HTTP 404). Please reload the page.";
  if (status >= 500) return `The server had a problem (HTTP ${status}). Please try again.`;
  return `Upload rejected (HTTP ${status}).`;
}

/**
 * Upload an image plus text fields. Tries multipart first, then falls back to a
 * JSON/base64 body if the multipart request itself could not get through.
 */
export async function uploadImage<T>(
  url: string,
  image: Blob | null,
  fields: Record<string, string>,
  filename = "image",
  headers: Record<string, string> = {},
): Promise<UploadOutcome<T>> {
  const parse = async (res: Response): Promise<UploadOutcome<T>> => {
    const text = await res.text();
    let json: (Record<string, unknown> & { error?: string }) | null = null;
    try {
      json = JSON.parse(text) as Record<string, unknown> & { error?: string };
    } catch {
      json = null;
    }
    if (res.ok && json && json.ok !== false) return { ok: true, data: json as T };
    return {
      ok: false,
      status: res.status,
      error: json?.error ?? describeStatus(res.status),
    };
  };

  // 1) multipart/form-data
  let multipartFailure: UploadOutcome<T> | null = null;
  try {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    if (image) {
      const ext = image.type.split("/")[1]?.replace("svg+xml", "svg") ?? "bin";
      form.append("file", image, `${filename}.${ext}`);
    }
    const res = await fetch(url, { method: "POST", body: form, cache: "no-store", headers });
    const outcome = await parse(res);
    // A real answer from our API (even an error) is final — only transport failures fall through.
    if (outcome.ok || (outcome.status < 500 && outcome.status !== 404)) return outcome;
    multipartFailure = outcome;
  } catch {
    multipartFailure = { ok: false, status: 0, error: "Network problem while uploading." };
  }

  // 2) JSON + base64 fallback (dodges multipart quirks in some proxies / webviews)
  try {
    const body: Record<string, string> = { ...fields };
    if (image) body.imageBase64 = await blobToBase64(image);
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return await parse(res);
  } catch {
    return (
      multipartFailure ?? {
        ok: false,
        status: 0,
        error: "Network problem while uploading. Check your connection and try again.",
      }
    );
  }
}
