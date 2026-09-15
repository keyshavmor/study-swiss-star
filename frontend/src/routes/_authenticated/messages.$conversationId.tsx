/** TanStack route module: /messages/$conversationId — one peer conversation. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/app/messaging/ConversationList";
import { MessageComposer } from "@/components/app/messaging/MessageComposer";
import { MessageThread } from "@/components/app/messaging/MessageThread";
import { NewConversationDialog } from "@/components/app/messaging/NewConversationDialog";
import { useI18n } from "@/lib/i18n/provider";
import { SafetyAvailabilityProvider } from "@/lib/safety-availability";
import {
  currentUserId,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  subscribeToPeerMessaging,
} from "@/lib/peer-messaging";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  head: () => ({
    meta: [
      { title: "Conversation — Alim's Study Assistant" },
      {
        name: "description",
        content: "Read and answer messages from classmates and teachers you know by username.",
      },
    ],
  }),
  component: ConversationPage,
});

function ConversationPage() {
  return (
    <SafetyAvailabilityProvider>
      <ConversationContent />
    </SafetyAvailabilityProvider>
  );
}

function ConversationContent() {
  const { t } = useI18n();
  const { conversationId } = Route.useParams();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ["peer-conversations"],
    queryFn: fetchConversations,
  });

  const {
    data: messages,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["peer-messages", conversationId],
    queryFn: () => fetchMessages(conversationId),
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    void currentUserId().then((id) => {
      setUserId(id);
      if (!id) return;
      unsubscribe = subscribeToPeerMessaging(id, () => {
        void queryClient.invalidateQueries({ queryKey: ["peer-messages", conversationId] });
        void queryClient.invalidateQueries({ queryKey: ["peer-conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["peer-unread-count"] });
      });
    });
    return () => unsubscribe?.();
  }, [conversationId, queryClient]);

  // Opening a thread marks it read; the unread state itself lives in Supabase.
  useEffect(() => {
    void markConversationRead(conversationId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["peer-conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["peer-unread-count"] });
      })
      .catch(() => {
        /* a failed read marker must not break the thread */
      });
  }, [conversationId, messages, queryClient]);

  return (
    <AppShell wide className="!px-0 !pb-0 !pt-0 sm:!px-0 sm:!pb-0">
      <div className="grid h-[calc(100vh-8.5rem)] grid-cols-1 overflow-hidden border-y border-border md:h-[calc(100vh-9rem)] md:grid-cols-[340px_1fr] md:border">
        <ConversationList
          conversations={conversations ?? []}
          activeId={conversationId}
          onNewConversation={() => setDialogOpen(true)}
          className="hidden border-r border-border md:flex"
        />
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
            <Button asChild variant="ghost" size="sm">
              <Link to="/messages">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("messages.backToList")}
              </Link>
            </Button>
          </div>
          <MessageThread messages={messages ?? []} currentUserId={userId} loadFailed={isError} />
          <MessageComposer
            conversationId={conversationId}
            onSent={() => {
              void refetch();
              void queryClient.invalidateQueries({ queryKey: ["peer-conversations"] });
            }}
          />
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {t("messages.persistNote")}
          </p>
        </div>
      </div>
      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  );
}
