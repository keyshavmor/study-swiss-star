/** Text + optional attachment composer that sends through the safety-gated server function. */
import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { blobToBase64, type PreparedAttachment } from "@/lib/attachment-processing";
import { useSafetyAvailability } from "@/lib/safety-availability";
import { sendPeerMessage } from "@/lib/safety.functions";
import { AttachmentPicker } from "@/components/app/messaging/AttachmentPicker";
import { SafetyNotice } from "@/components/app/messaging/SafetyNotice";
import type { SafetyDecision } from "@/lib/safety.types";

export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: () => void;
}) {
  const t = useT();
  const { reportDecision } = useSafetyAvailability();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<PreparedAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [decision, setDecision] = useState<SafetyDecision | null>(null);

  const canSend = !sending && (body.trim().length > 0 || attachment !== null);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setDecision(null);
    try {
      const attachments = attachment
        ? [
            {
              file_name: attachment.fileName,
              mime_type: attachment.mimeType,
              byte_size: attachment.finalBytes,
              data_base64: await blobToBase64(attachment.file),
            },
          ]
        : [];

      const result = await sendPeerMessage({
        data: { conversationId, body: body.trim(), attachments },
      });

      reportDecision(result.safety);

      if (result.sent) {
        setBody("");
        setAttachment(null);
        setDecision(null);
        onSent();
      } else {
        // Fail closed: keep the draft so the user can retry or edit it.
        setDecision(result.safety);
      }
    } catch {
      const unavailable: SafetyDecision = {
        verdict: "safety_unavailable",
        category_code: null,
        reason_code: null,
        strike_number: null,
        guardian_review_queued: null,
        account_suspended_pending_review: null,
        retryable: true,
        message_code: "safety_unavailable",
      };
      setDecision(unavailable);
      reportDecision(unavailable);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      {decision && (
        <SafetyNotice decision={decision} onRetry={() => void handleSend()} className="mb-3" />
      )}
      <AttachmentPicker attachment={attachment} onChange={setAttachment} disabled={sending} />
      <div className="mt-2 flex items-end gap-2">
        <Textarea
          value={body}
          placeholder={t("messages.composerPlaceholder")}
          disabled={sending}
          rows={2}
          className="min-h-[44px] flex-1 resize-none"
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button disabled={!canSend} onClick={() => void handleSend()}>
          <Send className="mr-1.5 h-4 w-4" />
          {sending ? t("messages.sending") : t("messages.send")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("messages.persistNote")}</p>
    </div>
  );
}
