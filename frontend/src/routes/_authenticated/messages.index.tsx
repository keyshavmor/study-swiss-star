/** TanStack route module: /messages — conversation list, no thread selected. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { ConversationList } from "@/components/app/messaging/ConversationList";
import { NewConversationDialog } from "@/components/app/messaging/NewConversationDialog";
import { useT } from "@/lib/i18n";
import { SafetyAvailabilityProvider } from "@/lib/safety-availability";
import { currentUserId, fetchConversations, subscribeToPeerMessaging } from "@/lib/peer-messaging";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — Alim's Study Assistant" },
      { name: "description", content: "Write to classmates and teachers you know by username." },
    ],
  }),
  component: MessagesIndexPage,
});

function MessagesIndexPage() {
  return (
    <SafetyAvailabilityProvider>
      <MessagesIndexContent />
    </SafetyAvailabilityProvider>
  );
}

function MessagesIndexContent() {
  const t = useT();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ["peer-conversations"],
    queryFn: fetchConversations,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    void currentUserId().then((userId) => {
      if (!userId) return;
      unsubscribe = subscribeToPeerMessaging(userId, () => {
        void queryClient.invalidateQueries({ queryKey: ["peer-conversations"] });
      });
    });
    return () => unsubscribe?.();
  }, [queryClient]);

  return (
    <AppShell wide className="!px-0 !pb-0 !pt-0 sm:!px-0 sm:!pb-0">
      <div className="grid h-[calc(100vh-8.5rem)] grid-cols-1 overflow-hidden border-y border-border md:h-[calc(100vh-9rem)] md:grid-cols-[340px_1fr] md:border">
        <ConversationList
          conversations={conversations ?? []}
          onNewConversation={() => setDialogOpen(true)}
          className="border-r border-border"
        />
        <div className="hidden items-center justify-center p-6 text-sm text-muted-foreground md:flex">
          {t("messages.selectConversation")}
        </div>
      </div>
      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  );
}
