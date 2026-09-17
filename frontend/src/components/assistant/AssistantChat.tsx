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
  Square,
  Trash2,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiBlockedNotice, useAiBlocked } from "@/components/app/AiFeatureGate";
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
import { isQuotaExceededError } from "@/lib/user-quota";
import { track, trackFailure } from "@/lib/telemetry";
import { useI18n } from "@/lib/i18n/provider";
import { effectiveResponseLanguage } from "@/lib/i18n/detect";
import type { LanguageCode } from "@/lib/i18n/languages";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { fetchPreferences, DEFAULT_PREFERENCES, type UserPreferences } from "@/lib/account-data";

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
  removeLabel,
}: {
  name: string;
  size: number;
  kind: string;
  onRemove?: () => void;
  removeLabel?: string;
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
          aria-label={removeLabel}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

export function AssistantChat({ threadId }: { threadId?: string }) {
  const { t, language, formatDate } = useI18n();
  const aiBlocked = useAiBlocked();
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
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Response-language hints per message id (frontend-only, not sent to the backend).
  const responseLanguageHints = useRef(new Map<string, LanguageCode>());
  // Ids present when a thread's history is first loaded — never autoplayed.
  const historyIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void formatDate;
  }, [formatDate]);

  useEffect(() => {
    fetchPreferences()
      .then(setPreferences)
      .catch(() => setPreferences(DEFAULT_PREFERENCES));
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      setSpeakingId(null);
    };
  }, [threadId]);

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await listAssistantThreads());
    } catch (err) {
      toast.error(t("assistant.loadThreadsFailed"));
    } finally {
      setLoadingThreads(false);
    }
  }, [t]);

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
        if (!cancelled) {
          historyIdsRef.current = new Set(rows.map((row) => row.id));
          setMessages(rows);
        }
      })
      .catch((err: unknown) => {
        toast.error(t("assistant.loadMessagesFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, t]);

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
      track({ event_name: "assistant_thread_created", feature: "assistant" });
    } catch (err) {
      trackFailure("assistant_thread_create_failed", err, { feature: "assistant" });
      toast.error(t("assistant.createFailed"));
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
    // No AI request may leave the browser without a backend-confirmed model.
    if (aiBlocked) return;
    setSending(true);
    // FUTURE BACKEND / CODEX: send { ui_language, message_language } so the model answers in
    // message_language when it is confidently one of the seven supported languages; otherwise
    // ui_language.
    const responseLanguageHint = effectiveResponseLanguage(content, language);
    // Counts only — the message text and attachment contents are never sent.
    track({
      event_name: "assistant_message_send_started",
      feature: "assistant",
      properties: { attachment_count: files.length },
    });
    try {
      let targetId = threadId;
      if (!targetId) {
        const thread = await createAssistantThread(deriveThreadTitle(content));
        targetId = thread.id;
        await refreshThreads();
        navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } });
      }
      const saved = await sendAssistantMessage({ threadId: targetId, content, files });
      responseLanguageHints.current.set(saved.id, responseLanguageHint);
      setMessages((current) => [...current, saved]);
      setText("");
      setFiles([]);
      if (activeThread && activeThread.title === "New conversation" && content) {
        await renameAssistantThread(activeThread.id, deriveThreadTitle(content));
      }
      await refreshThreads();
      track({
        event_name: "assistant_message_saved",
        feature: "assistant",
        properties: { attachment_count: files.length },
      });
    } catch (err) {
      trackFailure("assistant_message_failed", err, { feature: "assistant" });
      toast.error(isQuotaExceededError(err) ? t("quota.exceededError") : t("assistant.sendFailed"));
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
      toast.error(t("assistant.renameFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("assistant.deleteConfirm"))) return;
    try {
      await deleteAssistantThread(id);
      await refreshThreads();
      track({ event_name: "assistant_thread_deleted", feature: "assistant" });
      if (id === threadId) navigate({ to: "/assistant" });
      toast.success(t("assistant.deleteSuccess"));
    } catch (err) {
      toast.error(t("assistant.deleteFailed"));
    }
  };

  const handleToggleSpeech = (messageId: string, content: string) => {
    if (speakingId === messageId) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    const outcome = speak({
      text: content,
      uiLanguage: language,
      onEnd: () => setSpeakingId((current) => (current === messageId ? null : current)),
    });
    if (outcome === "spoken") setSpeakingId(messageId);
    else if (outcome === "unsupported") toast.error(t("assistant.audio.unsupported"));
    else if (outcome === "no-voice") toast.error(t("assistant.audio.noVoice"));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="app-card flex max-h-[70vh] flex-col overflow-hidden p-3 lg:max-h-[calc(100vh-220px)]">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          {t("assistant.newChat")}
        </Button>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {loadingThreads ? (
            <p className="px-2 py-3 text-[14px] text-muted-foreground">
              {t("assistant.loadingConversations")}
            </p>
          ) : threads.length === 0 ? (
            <p className="px-2 py-3 text-[14px] text-muted-foreground">
              {t("assistant.noConversations")}
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
                        aria-label={t("assistant.renameAria")}
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
                        aria-label={t("assistant.deleteAria")}
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
            <p className="text-[14px] text-muted-foreground">{t("assistant.loadingMessages")}</p>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <h2 className="text-[19px] font-semibold">{t("assistant.emptyTitle")}</h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {t("assistant.emptyDescription")}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const canPlay =
                isAssistant &&
                preferences.assistant_audio_enabled &&
                speechSupported() &&
                message.content.trim().length > 0;
              const isSpeaking = speakingId === message.id;
              return (
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
                    {canPlay && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-[12.5px] text-muted-foreground"
                        onClick={() => handleToggleSpeech(message.id, message.content)}
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="h-3.5 w-3.5" />
                            {t("assistant.audio.stop")}
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            {t("assistant.audio.listen")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {messages.length > 0 && messages[messages.length - 1]!.role === "user" && (
            <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-muted-foreground">
              {t("assistant.pendingNotice")}
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
                  removeLabel={t("assistant.removeAttachmentAria", { name: file.name })}
                  onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))}
                />
              ))}
            </div>
          )}
          {aiBlocked && (
            <div className="mb-3">
              <AiBlockedNotice />
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
              aria-label={t("assistant.attachAria")}
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
              disabled={aiBlocked}
              placeholder={t("assistant.composerPlaceholder")}
              rows={1}
              className="max-h-40 min-h-[44px] resize-none"
            />
            <Button
              size="icon"
              aria-label={t("assistant.sendAria")}
              onClick={() => void handleSend()}
              disabled={aiBlocked || sending || (!text.trim() && files.length === 0)}
            >
              {sending ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <ArrowUp className="h-[18px] w-[18px]" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            {t("assistant.attachmentHint")}
          </p>
        </div>
      </section>
    </div>
  );
}
