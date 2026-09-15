/** Dialog to start a conversation by exact username only (no browsable directory). */
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import {
  currentUserId,
  findPeerByExactUsername,
  getOrCreateDirectConversation,
} from "@/lib/peer-messaging";

export function NewConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setUsername("");
    setError(null);
    setBusy(false);
  }

  async function handleStart() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    try {
      const me = await currentUserId();
      const peer = await findPeerByExactUsername(trimmed);
      if (!peer) {
        setError(t("messages.notFound"));
        return;
      }
      if (me && peer.userId === me) {
        setError(t("messages.selfNotAllowed"));
        return;
      }
      const conversationId = await getOrCreateDirectConversation(trimmed);
      onOpenChange(false);
      reset();
      void navigate({ to: "/messages/$conversationId", params: { conversationId } });
    } catch {
      setError(t("messages.startFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("messages.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="peer-username">{t("messages.usernameLabel")}</Label>
          <Input
            id="peer-username"
            value={username}
            placeholder={t("messages.usernamePlaceholder")}
            disabled={busy}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleStart();
            }}
          />
          <p className="text-xs text-muted-foreground">{t("messages.usernameHint")}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button disabled={busy || !username.trim()} onClick={() => void handleStart()}>
            {busy ? t("messages.starting") : t("messages.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
