import { describe, expect, it } from "vitest";
import {
  PEER_ATTACHMENT_BUCKET,
  PEER_ATTACHMENT_MAX_BYTES,
  PEER_ATTACHMENT_MIME_TYPES,
  formatBytes,
  isAllowedAttachmentMime,
  isImageMime,
  prepareAttachment,
  safeFileName,
} from "./attachment-processing";

function file(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("peer attachment rules", () => {
  it("uses the private bucket and the hard 250000-byte budget", () => {
    expect(PEER_ATTACHMENT_BUCKET).toBe("peer-message-attachments");
    expect(PEER_ATTACHMENT_MAX_BYTES).toBe(250_000);
  });

  it("allows exactly PDF, DOC, DOCX, JPEG, PNG and WEBP", () => {
    expect([...PEER_ATTACHMENT_MIME_TYPES]).toEqual([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(isAllowedAttachmentMime("application/pdf")).toBe(true);
    expect(isAllowedAttachmentMime("image/gif")).toBe(false);
    expect(isAllowedAttachmentMime("application/zip")).toBe(false);
    expect(isImageMime("image/webp")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
  });

  it("sanitises the displayed filename", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\notes\\exam.pdf")).toBe("exam.pdf");
    expect(safeFileName("")).toBe("file");
  });

  it("rejects a disallowed MIME type", async () => {
    const result = await prepareAttachment(file("clip.gif", "image/gif", 100));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mime_not_allowed");
  });

  it("rejects oversized documents instead of truncating them", async () => {
    for (const mime of [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]) {
      const result = await prepareAttachment(file("notes", mime, PEER_ATTACHMENT_MAX_BYTES + 1));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("document_too_large");
    }
  });

  it("accepts a document within the budget unchanged", async () => {
    const result = await prepareAttachment(file("notes.pdf", "application/pdf", 1000));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.compressed).toBe(false);
      expect(result.finalBytes).toBe(1000);
    }
  });

  it("passes a small image straight through", async () => {
    const result = await prepareAttachment(file("photo.jpg", "image/jpeg", 5000));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.finalBytes).toBeLessThanOrEqual(PEER_ATTACHMENT_MAX_BYTES);
  });

  it("rejects an oversized image when compression cannot reach the budget", async () => {
    // No canvas in this environment, so compression cannot succeed: the result
    // must be a rejection, never an oversized "ok".
    const result = await prepareAttachment(file("big.png", "image/png", PEER_ATTACHMENT_MAX_BYTES * 4));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["image_compression_failed", "processing_failed"]).toContain(result.reason);
    }
  });

  it("formats byte sizes for the before/after label", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(250_000)).toBe("244.1 KB");
  });
});
