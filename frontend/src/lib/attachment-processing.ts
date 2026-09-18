/**
 * Peer-message attachment rules (CURRENT FRONTEND).
 *
 * CURRENT SUPABASE: the private bucket `peer-message-attachments` enforces a
 * HARD 250000-byte object limit and the MIME allow-list below. There is no
 * authenticated direct-upload policy: uploads only happen through the future
 * safety backend after an allow verdict.
 */

export const PEER_ATTACHMENT_BUCKET = "peer-message-attachments";
export const PEER_ATTACHMENT_MAX_BYTES = 250_000;

export const PEER_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PeerAttachmentMime = (typeof PEER_ATTACHMENT_MIME_TYPES)[number];

export function isAllowedAttachmentMime(mime: string): mime is PeerAttachmentMime {
  return (PEER_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mime);
}

export function isImageMime(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

/** Filenames are display-only: strip paths and control characters. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return (
    base
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "file"
  );
}

export type AttachmentRejection =
  "mime_not_allowed" | "document_too_large" | "image_compression_failed" | "processing_failed";

export interface PreparedAttachment {
  ok: true;
  file: Blob;
  fileName: string;
  mimeType: string;
  originalBytes: number;
  finalBytes: number;
  compressed: boolean;
}

export interface RejectedAttachment {
  ok: false;
  reason: AttachmentRejection;
  fileName: string;
  originalBytes: number;
  /** Smallest size reached while compressing, when relevant. */
  finalBytes: number | null;
}

export type AttachmentResult = PreparedAttachment | RejectedAttachment;

/** Iterative quality/scale ladder used to reach the byte budget. */
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.45, 0.35, 0.25];
const SCALE_STEPS = [1, 0.8, 0.65, 0.5, 0.4, 0.3, 0.2];

async function decodeImage(file: Blob): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode_failed"));
      element.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
}

/**
 * Compresses and, if needed, progressively downscales an image until it fits
 * `maxBytes`. Returns the smallest result achieved; the caller rejects when it
 * still does not fit. Documents are never truncated.
 */
export async function prepareAttachment(
  file: File,
  maxBytes: number = PEER_ATTACHMENT_MAX_BYTES,
): Promise<AttachmentResult> {
  const fileName = safeFileName(file.name);
  const mimeType = file.type;
  const originalBytes = file.size;

  if (!isAllowedAttachmentMime(mimeType)) {
    return { ok: false, reason: "mime_not_allowed", fileName, originalBytes, finalBytes: null };
  }

  if (!isImageMime(mimeType)) {
    if (originalBytes > maxBytes) {
      return {
        ok: false,
        reason: "document_too_large",
        fileName,
        originalBytes,
        finalBytes: originalBytes,
      };
    }
    return {
      ok: true,
      file,
      fileName,
      mimeType,
      originalBytes,
      finalBytes: originalBytes,
      compressed: false,
    };
  }

  if (originalBytes <= maxBytes) {
    return {
      ok: true,
      file,
      fileName,
      mimeType,
      originalBytes,
      finalBytes: originalBytes,
      compressed: false,
    };
  }

  try {
    const source = await decodeImage(file);
    let best: Blob | null = null;
    for (const scale of SCALE_STEPS) {
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      source.draw(ctx, width, height);
      for (const quality of QUALITY_STEPS) {
        const blob = await toBlob(canvas, quality);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= maxBytes) {
          return {
            ok: true,
            file: blob,
            fileName: fileName.replace(/\.(png|webp|jpeg|jpg)$/i, "") + ".jpg",
            mimeType: "image/jpeg",
            originalBytes,
            finalBytes: blob.size,
            compressed: true,
          };
        }
      }
    }
    return {
      ok: false,
      reason: "image_compression_failed",
      fileName,
      originalBytes,
      finalBytes: best?.size ?? null,
    };
  } catch {
    return { ok: false, reason: "processing_failed", fileName, originalBytes, finalBytes: null };
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
