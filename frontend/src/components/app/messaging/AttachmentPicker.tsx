/** Picks, compresses/validates and previews a single peer-message attachment. */
import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  formatBytes,
  prepareAttachment,
  type AttachmentResult,
  type PreparedAttachment,
} from "@/lib/attachment-processing";
import { isImageMime } from "@/lib/attachment-processing";
import { revokeObjectUrl, trackObjectUrl } from "@/lib/messaging-session";
import { cn } from "@/lib/utils";

export function AttachmentPicker({
  attachment,
  onChange,
  disabled,
}: {
  attachment: PreparedAttachment | null;
  onChange: (attachment: PreparedAttachment | null) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setProcessing(true);
    try {
      const result: AttachmentResult = await prepareAttachment(file);
      if (!result.ok) {
        setError(t(`messages.attach.error.${result.reason}`));
        onChange(null);
        return;
      }
      if (previewUrl) revokeObjectUrl(previewUrl);
      if (isImageMime(result.mimeType)) {
        const url = trackObjectUrl(URL.createObjectURL(result.file));
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
      onChange(result);
    } finally {
      setProcessing(false);
    }
  }

  function clear() {
    if (previewUrl) revokeObjectUrl(previewUrl);
    setPreviewUrl(null);
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || processing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {!attachment && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || processing}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="mr-1.5 h-4 w-4" />
            {processing ? t("messages.attach.processing") : t("messages.attach")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("messages.attach.allowed")}</span>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {attachment && (
        <div className={cn("flex items-center gap-3 rounded-md border border-border bg-muted/40 p-2")}>
          {previewUrl ? (
            <img src={previewUrl} alt={attachment.fileName} className="h-12 w-12 rounded object-cover" />
          ) : (
            <Paperclip className="h-8 w-8 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{attachment.fileName}</p>
            {attachment.compressed ? (
              <p className="text-xs text-muted-foreground">
                {t("messages.attach.compressed", {
                  from: formatBytes(attachment.originalBytes),
                  to: formatBytes(attachment.finalBytes),
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{formatBytes(attachment.finalBytes)}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={clear}
            aria-label={t("messages.attach.remove")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
