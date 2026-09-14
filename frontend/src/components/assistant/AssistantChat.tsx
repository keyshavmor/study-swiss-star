/**
 * General-purpose AI assistant workspace: conversation list, message history
 * and a composer that accepts text plus attachments.
 *
 * Persistence uses the separate `assistant_*` tables. Assistant replies are
 * NOT generated here — the local AI backend endpoint is not connected yet, so
 * messages and attachments are stored and shown as ready for it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquarePlus,
  Music,
  Paperclip,
  Pencil,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/storage-management";
import {
  createAssistantThread,
  deleteAssistantThread,
  deriveThreadTitle,
  listAssistantMessages,
  listAssistantThreads,
  renameAssistantThread,
  sendAssistantMessage,
  validateAttachment,
  type AssistantMessage,
  type AssistantThread,
} from "@/lib/assistant-data";
import { toast } from "sonner";

const KIND_ICON: Record<string, typeof FileText> = {
  image: ImageIcon,
  audio: Music,
  video: Video,
  document: FileText,
};

function AttachmentChip({
  name,
  size,
  kind,
  onRemove,
}: {
  name: string;
  size: number;
  kind: string;
  onRemove?: () => void;
}) {
  const Icon = KIND_ICON[kind] ?? FileText;
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-[13px]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{name}</span>
      <span className="shrink-0 text-muted-foreground">{formatBytes(size)}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

export function AssistantChat({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<AssistantThread[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await listAssistantThreads());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load conversations");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    listAssistantMessages(threadId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Could not load this conversation");
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === threadId) ?? null,
    [threads, threadId],
  );

  const handleNewChat = async () => {
    try {
      const thread = await createAssistantThread();
      await refreshThreads();
      navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a conversation");
    }
  };

  const handlePickFiles = (selected: FileList | null) => {
    if (!selected) return;
    const accepted: File[] = [];
    for (const file of Array.from(selected)) {
      const error = validateAttachment(file);
      if (error) toast.error(error);
      else accepted.push(file);
    }
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content && files.length === 0) return;
    setSending(true);
    try {
      let targetId = threadId;
      if (!targetId) {
        const thread = await createAssistantThread(deriveThreadTitle(content));
        targetId = thread.id;
        await refreshThreads();
        navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } });
      }
      const saved = await sendAssistantMessage({ threadId: targetId, content, files });
      setMessages((current) => [...current, saved]);
      setText("");
      setFiles([]);
      if (activeThread && activeThread.title === "New conversation" && content) {
        await renameAssistantThread(activeThread.id, deriveThreadTitle(content));
      }
      await refreshThreads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your message");
    } finally {
      setSending(false);
    }
  };

  const handleRename = async (id: string) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    try {
      await renameAssistantThread(id, title);
      await refreshThreads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename the conversation");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this conversation and its attachments?")) return;
    try {
      await deleteAssistantThread(id);
      await refreshThreads();
      if (id === threadId) navigate({ to: "/assistant" });
      toast.success("Conversation deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the conversation");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="app-card flex max-h-[70vh] flex-col overflow-hidden p-3 lg:max-h-[calc(100vh-220px)]">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {loadingThreads ? (
            <p className="px-2 py-3 text-[14px] text-muted-foreground">Loading conversations…</p>
          ) : threads.length === 0 ? (
            <p className="px-2 py-3 text-[14px] text-muted-foreground">
              No conversations yet. Start one above.
            </p>
          ) : (
            <ul className="space-y-1">
              {threads.map((thread) => (
                <li key={thread.id}>
                  {renamingId === thread.id ? (
                    <Input
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void handleRename(thread.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(thread.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="h-9"
                    />
                  ) : (
                    <div
                      className={cn(
                        "group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 rounded-xl px-2 transition-colors",
                        thread.id === threadId ? "bg-thread-active" : "hover:bg-hover",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: "/assistant/$threadId",
                            params: { threadId: thread.id },
                          })
                        }
                        className="truncate py-2.5 text-left text-[14.5px] font-medium"
                      >
                        {thread.title}
                      </button>
                      <button
                        type="button"
                        aria-label="Rename conversation"
                        onClick={() => {
                          setRenamingId(thread.id);
                          setRenameValue(thread.title);
                        }}
                        className="p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete conversation"
                        onClick={() => void handleDelete(thread.id)}
                        className="p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-warning focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="app-card flex min-h-[60vh] flex-col p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {loadingMessages ? (
            <p className="text-[14px] text-muted-foreground">Loading messages…</p>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <h2 className="text-[19px] font-semibold">General assistant</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                A general-purpose chat, separate from your subject tutoring. Ask anything, or attach
                an image, recording, video (up to 1 MB each), PDF or Word document.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-foreground",
                  )}
                >
                  {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                  {message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((attachment) => (
                        <AttachmentChip
                          key={attachment.id}
                          name={attachment.fileName}
                          size={attachment.byteSize}
                          kind={attachment.kind}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {messages.length > 0 && messages[messages.length - 1]!.role === "user" && (
            <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-muted-foreground">
              Saved and ready for the local AI backend. Replies will appear here once the assistant
              endpoint is connected; attachments are stored but not yet read by the backend.
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          {files.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <AttachmentChip
                  key={`${file.name}-${index}`}
                  name={file.name}
                  size={file.size}
                  kind={file.type.split("/")[0] ?? "document"}
                  onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))}
                />
              ))}
            </div>
          )}
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,audio/*,video/*,.pdf,.docx,.doc"
              onChange={(e) => handlePickFiles(e.target.files)}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Attach files"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Message the assistant…"
              rows={1}
              className="max-h-40 min-h-[44px] resize-none"
            />
            <Button
              size="icon"
              aria-label="Send message"
              onClick={() => void handleSend()}
              disabled={sending || (!text.trim() && files.length === 0)}
            >
              {sending ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <ArrowUp className="h-[18px] w-[18px]" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Images, audio and video up to 1 MB each. PDF and Word documents are also accepted.
          </p>
        </div>
      </section>
    </div>
  );
}
