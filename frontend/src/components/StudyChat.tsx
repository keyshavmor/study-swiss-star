/** Top-level tutoring/authentication component used by TanStack routes. */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery } from "@tanstack/react-query";
import { listThreads, listMessages, createThread, deleteThread } from "@/lib/chat.functions";
import { ThreadList } from "./ThreadList";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SourceSnippetList } from "@/components/app/SourceSnippetList";
import { GraduationCap, Plus, LogOut, Volume2, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAcademicYear } from "@/lib/store/academic-year";
import type { ContextResponseMetadata } from "@/lib/context-backend.types";
import { toast } from "sonner";
import { track, trackFailure } from "@/lib/telemetry";
import ReactMarkdown from "react-markdown";
import type { UIMessage } from "ai";
import { useI18n } from "@/lib/i18n/provider";
import { effectiveResponseLanguage } from "@/lib/i18n/detect";
import type { LanguageCode } from "@/lib/i18n/languages";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { fetchPreferences, DEFAULT_PREFERENCES, type UserPreferences } from "@/lib/account-data";

interface StudyChatProps {
  threadId?: string;
}

export function StudyChat({ threadId }: StudyChatProps) {
  const { t, language, formatDate } = useI18n();
  const routeParams = useParams({ strict: false });
  const activeThreadId = threadId ?? routeParams?.threadId;
  const navigate = useNavigate();
  const { yearId, year } = useAcademicYear();

  const listThreadsFn = useServerFn(listThreads);
  const listMessagesFn = useServerFn(listMessages);
  const createThreadFn = useServerFn(createThread);
  const deleteThreadFn = useServerFn(deleteThread);

  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadSubject, setNewThreadSubject] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Response-language hints per assistant message id (frontend-only, not sent to the backend).
  const responseLanguageHints = useRef(new Map<string, LanguageCode>());
  const pendingHintRef = useRef<LanguageCode | null>(null);

  useEffect(() => {
    void formatDate; // keep reference used below for timestamps
  }, [formatDate]);

  useEffect(() => {
    fetchPreferences()
      .then(setPreferences)
      .catch(() => setPreferences(DEFAULT_PREFERENCES));
  }, []);

  // Stop any speech when switching threads or unmounting.
  useEffect(() => {
    return () => {
      stopSpeaking();
      setSpeakingId(null);
    };
  }, [activeThreadId]);

  const {
    data: threads,
    isLoading: threadsLoading,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ["threads"],
    queryFn: listThreadsFn,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", activeThreadId],
    queryFn: () => listMessagesFn({ data: { threadId: activeThreadId! } }),
    enabled: !!activeThreadId,
  });

  const chat = useChat({
    ...(activeThreadId ? { id: activeThreadId } : {}),
    messages: (messages as unknown as UIMessage[]) ?? [],
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        threadId: activeThreadId,
        academicYear: yearId,
        gradeLevel: Number(year.gradeLevel.replace(/\D/g, "")),
      },
      fetch: async (input, init) => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers = new Headers(init?.headers);
        if (session?.access_token) {
          headers.set("Authorization", `Bearer ${session.access_token}`);
        }
        return fetch(input, { ...init, headers });
      },
    }),
    onError: (err) => {
      trackFailure("chat_message_failed", err, { feature: "chat" });
      toast.error(err.message || t("chat.sendFailed"));
    },
    onFinish: ({ message }) => {
      // Status only — prompts and responses are never sent to telemetry.
      track({ event_name: "chat_message_completed", feature: "chat" });
      const hint = pendingHintRef.current;
      if (hint) responseLanguageHints.current.set(message.id, hint);
      if (preferences.assistant_audio_enabled && preferences.assistant_audio_autoplay) {
        const text = message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
        if (text.trim()) {
          const outcome = speak({
            text,
            uiLanguage: language,
            onEnd: () => setSpeakingId((current) => (current === message.id ? null : current)),
          });
          if (outcome === "spoken") setSpeakingId(message.id);
          else if (outcome === "unsupported") toast.error(t("assistant.audio.unsupported"));
          else if (outcome === "no-voice") toast.error(t("assistant.audio.noVoice"));
        }
      }
    },
  });

  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      navigate({ to: "/chat/$threadId", params: { threadId: threads[0]!.id } });
    }
  }, [activeThreadId, threads, navigate]);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadSubject.trim()) return;
    try {
      const thread = await createThreadFn({
        data: { title: newThreadTitle.trim(), subject: newThreadSubject.trim() },
      });
      setNewThreadOpen(false);
      setNewThreadTitle("");
      setNewThreadSubject("");
      await refetchThreads();
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("chat.createFailed"));
    }
  };

  const handleDeleteThread = async (id: string) => {
    try {
      await deleteThreadFn({ data: { threadId: id } });
      await refetchThreads();
      if (id === activeThreadId) {
        navigate({ to: "/chat" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("chat.deleteFailed"));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleToggleSpeech = (messageId: string, text: string) => {
    if (speakingId === messageId) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    const outcome = speak({
      text,
      uiLanguage: language,
      onEnd: () => setSpeakingId((current) => (current === messageId ? null : current)),
    });
    if (outcome === "spoken") setSpeakingId(messageId);
    else if (outcome === "unsupported") toast.error(t("assistant.audio.unsupported"));
    else if (outcome === "no-voice") toast.error(t("assistant.audio.noVoice"));
  };

  const isLoading =
    threadsLoading || messagesLoading || chat.status === "submitted" || chat.status === "streaming";

  const activeThread = threads?.find((t) => t.id === activeThreadId);

  const sessionDialogFields = (suffix: string) => (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label
          htmlFor={`subject${suffix}`}
          className="text-[13px] font-semibold text-muted-foreground"
        >
          {t("chat.subjectLabel")}
        </Label>
        <Input
          id={`subject${suffix}`}
          placeholder={t("chat.subjectPlaceholder")}
          value={newThreadSubject}
          onChange={(e) => setNewThreadSubject(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor={`title${suffix}`}
          className="text-[13px] font-semibold text-muted-foreground"
        >
          {t("chat.topicLabel")}
        </Label>
        <Input
          id={`title${suffix}`}
          placeholder={t("chat.topicPlaceholder")}
          value={newThreadTitle}
          onChange={(e) => setNewThreadTitle(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full">
      <aside className="hidden w-[288px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            School
          </span>
        </Link>
        <div className="px-4 pb-3">
          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full justify-center gap-2">
                <Plus className="h-4 w-4" />
                {t("chat.newSession")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("chat.dialogTitle")}</DialogTitle>
                <DialogDescription>{t("chat.dialogDescription")}</DialogDescription>
              </DialogHeader>
              {sessionDialogFields("")}
              <DialogFooter>
                <Button
                  onClick={handleCreateThread}
                  disabled={!newThreadTitle.trim() || !newThreadSubject.trim()}
                >
                  {t("chat.createSession")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <ThreadList
            threads={threads ?? []}
            {...(activeThreadId ? { activeThreadId } : {})}
            onDelete={handleDeleteThread}
            isLoading={threadsLoading}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border p-4">
          <Button variant="ghost" size="sm" className="gap-2 font-medium" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {t("chat.signOut")}
          </Button>
          <ThemeToggle />
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[15px] font-semibold">School</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {activeThread?.subject ?? t("chat.studySessionFallback")}
            </p>
            <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-foreground">
              {activeThread?.title ?? t("chat.readyTitle")}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
              <DialogTrigger asChild>
                <Button size="icon" aria-label={t("chat.newSessionAria")}>
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("chat.dialogTitle")}</DialogTitle>
                  <DialogDescription>{t("chat.dialogDescription")}</DialogDescription>
                </DialogHeader>
                {sessionDialogFields("-mobile")}
                <DialogFooter>
                  <Button
                    onClick={handleCreateThread}
                    disabled={!newThreadTitle.trim() || !newThreadSubject.trim()}
                  >
                    {t("chat.createSession")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <Conversation className="h-full">
            <ConversationContent className="mx-auto w-full max-w-3xl px-5 py-8 lg:px-8">
              {chat.messages.length === 0 && !messagesLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-hover text-primary">
                    <GraduationCap className="h-7 w-7" />
                  </span>
                  <h2 className="text-[19px] font-semibold text-foreground">
                    {t("chat.readyTitle")}
                  </h2>
                  <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
                    {t("chat.readyDescription")}
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => {
                  const text = message.parts
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("");
                  const contextMetadata = message.parts.find(
                    (part) => part.type === "data-context-metadata",
                  ) as { data?: ContextResponseMetadata } | undefined;
                  const isAssistant = message.role === "assistant";
                  const isFinished = chat.status !== "streaming" && chat.status !== "submitted";
                  const canPlay =
                    isAssistant &&
                    isFinished &&
                    preferences.assistant_audio_enabled &&
                    speechSupported() &&
                    text.trim().length > 0;
                  const isSpeaking = speakingId === message.id;
                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent
                        className={
                          message.role === "user"
                            ? "rounded-[18px] bg-user px-5 py-3 text-[15px] text-user-foreground"
                            : undefined
                        }
                      >
                        {message.role === "assistant" ? (
                          <div className="prose-study">
                            <ReactMarkdown>{text}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{text}</p>
                        )}
                      </MessageContent>
                      {message.role === "assistant" && contextMetadata?.data?.examTip && (
                        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-[13px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {t("chat.examTip")}{" "}
                          </span>
                          {contextMetadata.data.examTip}
                        </div>
                      )}
                      {message.role === "assistant" && (
                        <SourceSnippetList sources={contextMetadata?.data?.sources ?? []} />
                      )}
                      {canPlay && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 gap-1.5 px-2 text-[12.5px] text-muted-foreground"
                          onClick={() => handleToggleSpeech(message.id, text)}
                        >
                          {isSpeaking ? (
                            <>
                              <Square className="h-3.5 w-3.5" />
                              {t("chat.audio.stop")}
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5" />
                              {t("chat.audio.listen")}
                            </>
                          )}
                        </Button>
                      )}
                    </Message>
                  );
                })
              )}
              {(chat.status === "submitted" || chat.status === "streaming") && (
                <div className="px-1 py-2">
                  <Shimmer className="text-muted-foreground">{t("chat.thinking")}</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="border-t border-border bg-surface px-5 py-4 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <PromptInput
              className="rounded-[18px] border-border bg-input-background shadow-none"
              onSubmit={(message) => {
                const value = message.text.trim();
                if (!value) return;
                track({ event_name: "chat_message_sent", feature: "chat" });
                // FUTURE BACKEND / CODEX: send { ui_language, message_language } so the model
                // answers in message_language when it is confidently one of the five supported
                // languages; otherwise ui_language.
                const responseLanguageHint = effectiveResponseLanguage(value, language);
                pendingHintRef.current = responseLanguageHint;
                chat.sendMessage({ text: value });
              }}
            >
              <PromptInputTextarea
                placeholder={t("chat.composerPlaceholder")}
                className="min-h-[76px] resize-none text-[15px]"
                disabled={isLoading}
              />
              <PromptInputFooter className="justify-end border-0">
                <PromptInputSubmit status={chat.status} disabled={isLoading} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </main>
    </div>
  );
}
