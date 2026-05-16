// Client-side image compression. Runs before the File is uploaded to the
// server action, so we never push multi-megabyte phone-camera originals
// across the wire or into Supabase Storage.
//
// Behaviour:
//   - Non-image MIME types (PDF, etc.) are returned untouched.
//   - Images already under `minSize` are returned untouched.
//   - Images are resized so the longest edge ≤ `maxDim` (preserving aspect
//     ratio), drawn onto a 2D canvas, then re-encoded as JPEG at `quality`.
//   - If the re-encoded blob is somehow *larger* than the original (rare,
//     but possible for tiny screenshots), we keep the original.
//
// All work happens in the browser; nothing in this file is server-safe.

export interface CompressOptions {
  /** Longest edge in pixels after resize. Default 1800. */
  maxDim?: number;
  /** JPEG quality 0–1. Default 0.82. */
  quality?: number;
  /** Files smaller than this (bytes) are returned untouched. Default 200 KB. */
  minSize?: number;
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxDim = 1800, quality = 0.82, minSize = 200 * 1024 } = opts;

  if (!file.type.startsWith("image/")) return file;
  if (file.size <= minSize) return file;

  // createImageBitmap handles EXIF orientation automatically in modern
  // browsers, which is exactly what we want for phone photos. HEIC and a
  // handful of older formats may fail to decode — bail to the original.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
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
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[a-z0-9]+$/i, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
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
