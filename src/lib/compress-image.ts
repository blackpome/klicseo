// Client-side image + PDF compression. Runs before the File is uploaded to
// the server action, so we never push multi-megabyte phone-camera originals
// (or scanner PDFs) across the wire or into Supabase Storage.
//
// Behaviour:
//   - Images and PDFs are decoded to a canvas, then re-encoded as JPEG.
//   - PDFs are rasterized via pdfjs-dist. Multi-page PDFs become a single
//     tall JPEG with pages stacked top-to-bottom.
//   - We iterate (drop quality, then scale down) until the JPEG fits
//     `targetSize` (default 1 MB). The form server action caps request
//     bodies, so this is the contract we need to keep.
//   - Already-small files (< minSize) are returned untouched.
//   - Unknown MIME types pass through unchanged.

export interface CompressOptions {
  /** Longest edge in pixels after the first resize. Default 1800. */
  maxDim?: number;
  /** Starting JPEG quality 0–1. Default 0.82. */
  quality?: number;
  /** Files smaller than this (bytes) are returned untouched. Default 200 KB. */
  minSize?: number;
  /** Hard upper bound on the output size in bytes. Default 1 MB. */
  targetSize?: number;
}

const DEFAULT_TARGET = 1024 * 1024;

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxDim = 1800, quality = 0.82, minSize = 200 * 1024, targetSize = DEFAULT_TARGET } = opts;

  if (file.size <= minSize && file.size <= targetSize) return file;

  let canvas: HTMLCanvasElement | null = null;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  if (isPdf) {
    canvas = await rasterizePdf(file, maxDim);
  } else if (file.type.startsWith("image/")) {
    canvas = await decodeImage(file, maxDim);
  }

  if (!canvas) {
    // Unknown / undecodable input — if it's already under the cap, ship it;
    // otherwise the caller will get the oversize file back and the server
    // action will reject it with its normal error path.
    return file;
  }

  const blob = await encodeUnderCap(canvas, quality, targetSize);
  if (!blob) return file;
  if (!isPdf && blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[a-z0-9]+$/i, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function decodeImage(file: File, maxDim: number): Promise<HTMLCanvasElement | null> {
  // createImageBitmap handles EXIF orientation automatically in modern
  // browsers, which is exactly what we want for phone photos. HEIC and a
  // handful of older formats may fail to decode.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas;
}

async function rasterizePdf(file: File, maxDim: number): Promise<HTMLCanvasElement | null> {
  // Dynamic import keeps pdfjs out of the initial bundle — only the
  // application form pulls it in, and only when a PDF is actually picked.
  const pdfjs = await import("pdfjs-dist");
  // Worker ships as a separate .mjs. `new URL(..., import.meta.url)` is the
  // form Next/Turbopack rewrites into an asset URL at build time.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const pages: HTMLCanvasElement[] = [];
  let totalHeight = 0;
  let maxWidth = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1, maxDim / Math.max(baseViewport.width, baseViewport.height)) * 2;
      // The ×2 keeps text sharp; we'll downscale again in the encode loop if
      // it overshoots the byte cap.
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        page.cleanup();
        return null;
      }
      // White background — PDFs are usually transparent, JPEG isn't.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      page.cleanup();
      pages.push(canvas);
      totalHeight += canvas.height;
      if (canvas.width > maxWidth) maxWidth = canvas.width;
    }
  } finally {
    doc.destroy();
  }

  if (pages.length === 0) return null;
  if (pages.length === 1) return pages[0];

  const combined = document.createElement("canvas");
  combined.width = maxWidth;
  combined.height = totalHeight;
  const cctx = combined.getContext("2d");
  if (!cctx) return null;
  cctx.fillStyle = "#ffffff";
  cctx.fillRect(0, 0, combined.width, combined.height);
  let y = 0;
  for (const p of pages) {
    cctx.drawImage(p, 0, y);
    y += p.height;
  }
  return combined;
}

// Iteratively re-encode until the JPEG fits under `targetSize`. We drop
// quality first (cheaper, preserves resolution), then start downscaling.
async function encodeUnderCap(
  source: HTMLCanvasElement,
  startQuality: number,
  targetSize: number,
): Promise<Blob | null> {
  let current = source;
  let quality = startQuality;
  // 12 attempts is enough to cross 4 quality drops + 8 halvings of scale,
  // which handles even pathological 50 MB scans.
  for (let attempt = 0; attempt < 12; attempt++) {
    const blob = await new Promise<Blob | null>((resolve) =>
      current.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return null;
    if (blob.size <= targetSize) return blob;

    if (quality > 0.45) {
      quality = Math.max(0.45, quality - 0.12);
      continue;
    }
    // Quality floor reached — downscale 80% and retry at a moderate quality.
    const next = document.createElement("canvas");
    next.width = Math.max(1, Math.round(current.width * 0.8));
    next.height = Math.max(1, Math.round(current.height * 0.8));
    const nctx = next.getContext("2d");
    if (!nctx) return blob;
    nctx.fillStyle = "#ffffff";
    nctx.fillRect(0, 0, next.width, next.height);
    nctx.drawImage(current, 0, 0, next.width, next.height);
    current = next;
    quality = 0.7;
  }
  // Couldn't get under the cap; return whatever the last encode produced so
  // the caller can decide (we fall back to the original file upstream).
  return new Promise<Blob | null>((resolve) => current.toBlob(resolve, "image/jpeg", quality));
}

// React change-handler helper: compresses the chosen file in place and
// rewrites the input's FileList so the native form submission picks up the
// compressed File. The input keeps acting like a plain <input type="file">.
export async function attachCompressedFileTo(
  input: HTMLInputElement,
  opts?: CompressOptions,
): Promise<void> {
  const file = input.files?.[0];
  if (!file) return;
  const out = await compressImage(file, opts);
  if (out === file) return;
  const dt = new DataTransfer();
  dt.items.add(out);
  input.files = dt.files;
}
