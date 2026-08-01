import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listThreads, createThread } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Study chat — StudyMate" },
      { name: "description", content: "Pick up where you left off or start a new study session." },
      { property: "og:title", content: "Study chat — StudyMate" },
      { property: "og:description", content: "Pick up where you left off or start a new study session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: listThreadsFn,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (threads && threads.length > 0) {
    throw redirect({ to: "/chat/$threadId", params: { threadId: threads[0]!.id } });
  }

  createThreadFn({ data: { title: "General study session", subject: "All subjects" } })
    .then((thread) => {
      throw redirect({ to: "/chat/$threadId", params: { threadId: thread.id } });
    })
    .catch(() => {
      // handled by router error boundary
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
