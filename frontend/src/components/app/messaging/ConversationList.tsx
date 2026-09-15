/** Left-pane list of the signed-in user's peer conversations. */
import { Link } from "@tanstack/react-router";
import { Bell, MessageCirclePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/provider";
import {
  getMessagingPreferences,
  saveMessagingPreferences,
  type MessagingPreferences,
} from "@/lib/messaging-preferences";
import type { PeerConversationSummary } from "@/lib/peer-messaging";
import { cn } from "@/lib/utils";

function NotificationSettings() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<MessagingPreferences | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void getMessagingPreferences().then(setPrefs);
  }, []);

  async function togglePeer(next: boolean) {
    const updated = await saveMessagingPreferences({ peerMessageNotifications: next });
    setPrefs(updated);
  }

  async function toggleBrowser(next: boolean) {
    setNote(null);
    if (!next) {
      const updated = await saveMessagingPreferences({ browserMessageNotifications: false });
      setPrefs(updated);
      return;
    }
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setNote(t("messages.notifications.unsupported"));
      return;
    }
    if (Notification.permission === "denied") {
      setNote(t("messages.notifications.blocked"));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const updated = await saveMessagingPreferences({ browserMessageNotifications: true });
      setPrefs(updated);
      setNote(t("messages.notifications.enabled"));
    } else {
      setNote(t("messages.notifications.denied"));
    }
  }

  if (!prefs) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("messages.notifications.title")}>
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-4">
        <p className="text-sm font-semibold">{t("messages.notifications.title")}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("nav.messages")}</span>
          <Switch
            checked={prefs.peerMessageNotifications}
            onCheckedChange={(v) => void togglePeer(v)}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{t("messages.notifications.enable")}</span>
          <Switch
            checked={prefs.browserMessageNotifications}
            onCheckedChange={(v) => void toggleBrowser(v)}
          />
        </div>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        <p className="text-xs text-muted-foreground">{t("messages.persistNote")}</p>
      </PopoverContent>
    </Popover>
  );
}

function peerDisplayName(conversation: PeerConversationSummary): string {
  const peer = conversation.members[0];
  if (!peer) return "";
  return peer.preferredName?.trim() || peer.username;
}

export function ConversationList({
  conversations,
  activeId,
  onNewConversation,
  className,
}: {
  conversations: PeerConversationSummary[];
  activeId?: string;
  onNewConversation: () => void;
  className?: string;
}) {
  const { t, formatDateCompact } = useI18n();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-[16px] font-semibold">{t("messages.title")}</h2>
        <div className="flex items-center gap-1.5">
          <NotificationSettings />
          <Button size="sm" onClick={onNewConversation}>
            <MessageCirclePlus className="mr-1.5 h-4 w-4" />
            {t("messages.new")}
          </Button>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-[15px] font-medium">{t("messages.empty.title")}</p>
          <p className="text-sm text-muted-foreground">{t("messages.empty.body")}</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            const name = peerDisplayName(conversation);
            const isActive = conversation.id === activeId;
            return (
              <li key={conversation.id}>
                <Link
                  to="/messages/$conversationId"
                  params={{ conversationId: conversation.id }}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors hover:bg-muted/50",
                    isActive && "bg-muted",
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback>{name.slice(0, 1).toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[14.5px] font-medium">{name}</p>
                      {conversation.lastMessageAt && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDateCompact(conversation.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="default" className="shrink-0">
                      {t("messages.unreadBadge", { count: conversation.unreadCount })}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
