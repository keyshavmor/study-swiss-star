import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-sidebar-accent/50" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return <p className="px-2 text-sm text-sidebar-foreground/60">No sessions yet.</p>;
  }

  return (
    <div className="space-y-1">
      {threads.map((thread) => {
        const isActive = thread.id === activeThreadId;
        return (
          <div
            key={thread.id}
            className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
              isActive ? "bg-thread-active text-sidebar-accent-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
            }`}
          >
            <Link
              to="/chat/$threadId"
              params={{ threadId: thread.id }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <span className="truncate text-sm font-medium">{thread.title}</span>
              <span className="truncate text-xs opacity-70">{thread.subject}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread.id);
              }}
              aria-label="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
