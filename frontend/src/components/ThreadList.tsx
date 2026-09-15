/** Top-level tutoring/authentication component used by TanStack routes. */
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

interface Thread {
  id: string;
  title: string;
  subject: string;
  updated_at: string;
}

interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function ThreadList({ threads, activeThreadId, onDelete, isLoading }: ThreadListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-hover" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return <p className="px-3 py-2 text-[14px] text-muted-foreground">{t("chat.sessionsEmpty")}</p>;
  }

  return (
    <div className="space-y-1">
      {threads.map((thread) => {
        const isActive = thread.id === activeThreadId;
        return (
          <div
            key={thread.id}
            className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors duration-200 ${
              isActive
                ? "bg-thread-active text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-hover"
            }`}
          >
            <Link
              to="/chat/$threadId"
              params={{ threadId: thread.id }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <span
                className={`truncate text-[14px] font-semibold ${isActive ? "text-primary" : ""}`}
              >
                {thread.title}
              </span>
              <span className="truncate text-[12px] text-muted-foreground">{thread.subject}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread.id);
              }}
              aria-label={t("chat.deleteSessionAria")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
