/** Scrollable message list for one peer conversation. */
import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { attachmentUrl, type PeerMessageRow } from "@/lib/peer-messaging";
import { cn } from "@/lib/utils";

function AttachmentView({ attachment }: { attachment: PeerMessageRow["attachments"][number] }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const isImage = attachment.mimeType.startsWith("image/");
  const isPending = attachment.scanStatus !== "clean" && attachment.scanStatus !== "approved";

  useEffect(() => {
    let cancelled = false;
    if (!isPending) {
      void attachmentUrl(attachment.bucket, attachment.objectPath).then((signed) => {
        if (!cancelled) setUrl(signed);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [attachment.bucket, attachment.objectPath, isPending]);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("messages.attach.scanPending")}
      </div>
    );
  }

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={attachment.fileName}
          className="max-h-56 max-w-xs rounded-md border border-border object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{attachment.fileName}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {t("messages.attach.download")}
      </span>
    </a>
  );
}

export function MessageThread({
  messages,
  currentUserId,
  loadFailed,
}: {
  messages: PeerMessageRow[];
  currentUserId: string | null;
  loadFailed?: boolean;
}) {
  const { t, formatDateTime } = useI18n();

  if (loadFailed) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-destructive">
        {t("messages.loadFailed")}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        {t("messages.emptyThread")}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {messages.map((message) => {
        const isMine = message.senderId === currentUserId;
        return (
          <div
            key={message.id}
            className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[80%] space-y-2 rounded-2xl px-3.5 py-2.5 text-[14.5px]",
                isMine ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
              {message.attachments.map((attachment) => (
                <AttachmentView key={attachment.id} attachment={attachment} />
              ))}
            </div>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {isMine ? t("messages.you") : ""} {formatDateTime(message.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
