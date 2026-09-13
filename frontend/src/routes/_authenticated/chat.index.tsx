/** TanStack route module defining one Alim screen or local API boundary. */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { listThreads, createThread } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Study chat — StudyMate" },
      { name: "description", content: "Pick up where you left off or start a new study session." },
      { property: "og:title", content: "Study chat — StudyMate" },
      {
        property: "og:description",
        content: "Pick up where you left off or start a new study session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const listThreadsFn = useServerFn(listThreads);
  const createThreadFn = useServerFn(createThread);
  const handled = useRef(false);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: listThreadsFn,
  });

  useEffect(() => {
    if (isLoading || handled.current) return;
    handled.current = true;

    const first = threads?.[0];
    if (first) {
      navigate({ to: "/chat/$threadId", params: { threadId: first.id }, replace: true });
      return;
    }

    createThreadFn({ data: { title: "General study session", subject: "All subjects" } })
      .then((thread) => {
        navigate({ to: "/chat/$threadId", params: { threadId: thread.id }, replace: true });
      })
      .catch(() => {
        handled.current = false;
      });
  }, [isLoading, threads, navigate, createThreadFn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
