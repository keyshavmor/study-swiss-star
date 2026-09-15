/** Left-pane list of the signed-in user's peer conversations. */
import { Link } from "@tanstack/react-router";
import { MessageCirclePlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { PeerConversationSummary } from "@/lib/peer-messaging";
import { cn } from "@/lib/utils";

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
        <Button size="sm" onClick={onNewConversation}>
          <MessageCirclePlus className="mr-1.5 h-4 w-4" />
          {t("messages.new")}
        </Button>
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
