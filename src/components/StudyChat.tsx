import { useEffect, useState } from "react";
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
import { GraduationCap, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { UIMessage } from "ai";

interface StudyChatProps {
  threadId?: string;
}

export function StudyChat({ threadId }: StudyChatProps) {
  const routeParams = useParams({ strict: false });
  const activeThreadId = threadId ?? routeParams?.threadId;
  const navigate = useNavigate();

  const listThreadsFn = useServerFn(listThreads);
  const listMessagesFn = useServerFn(listMessages);
  const createThreadFn = useServerFn(createThread);
  const deleteThreadFn = useServerFn(deleteThread);

  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadSubject, setNewThreadSubject] = useState("");

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
    id: activeThreadId,
    messages: (messages as unknown as UIMessage[]) ?? [],
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId: activeThreadId },
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
      toast.error(err.message || "Failed to send message");
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
      toast.error(err instanceof Error ? err.message : "Failed to create session");
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
      toast.error(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const isLoading =
    threadsLoading || messagesLoading || chat.status === "submitted" || chat.status === "streaming";

  const activeThread = threads?.find((t) => t.id === activeThreadId);

  const sessionDialogFields = (suffix: string) => (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Label htmlFor={`subject${suffix}`} className="text-[13px] font-semibold text-muted-foreground">
          Subject
        </Label>
        <Input
          id={`subject${suffix}`}
          placeholder="e.g. Mathematics, Latin, History"
          value={newThreadSubject}
          onChange={(e) => setNewThreadSubject(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`title${suffix}`} className="text-[13px] font-semibold text-muted-foreground">
          Topic
        </Label>
        <Input
          id={`title${suffix}`}
          placeholder="e.g. Integral calculus review"
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
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">School</span>
        </Link>
        <div className="px-4 pb-3">
          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full justify-center gap-2">
                <Plus className="h-4 w-4" />
                New study session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New study session</DialogTitle>
                <DialogDescription>Pick a subject and topic for this session.</DialogDescription>
              </DialogHeader>
              {sessionDialogFields("")}
              <DialogFooter>
                <Button
                  onClick={handleCreateThread}
                  disabled={!newThreadTitle.trim() || !newThreadSubject.trim()}
                >
                  Create session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <ThreadList
            threads={threads ?? []}
            activeThreadId={activeThreadId}
            onDelete={handleDeleteThread}
            isLoading={threadsLoading}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border p-4">
          <Button variant="ghost" size="sm" className="gap-2 font-medium" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
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
              {activeThread?.subject ?? "Study session"}
            </p>
            <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-foreground">
              {activeThread?.title ?? "Get ready for your exams"}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
              <DialogTrigger asChild>
                <Button size="icon" aria-label="New study session">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New study session</DialogTitle>
                  <DialogDescription>Pick a subject and topic for this session.</DialogDescription>
                </DialogHeader>
                {sessionDialogFields("-mobile")}
                <DialogFooter>
                  <Button
                    onClick={handleCreateThread}
                    disabled={!newThreadTitle.trim() || !newThreadSubject.trim()}
                  >
                    Create session
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
                  <h2 className="text-[19px] font-semibold text-foreground">Ready to study?</h2>
                  <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">
                    Ask for an explanation, a quiz, or a study plan for your next exam.
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => {
                  const text = message.parts
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("");
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
                    </Message>
                  );
                })
              )}
              {(chat.status === "submitted" || chat.status === "streaming") && (
                <div className="px-1 py-2">
                  <Shimmer className="text-muted-foreground">Thinking…</Shimmer>
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
                chat.sendMessage({ text: value });
              }}
            >
              <PromptInputTextarea
                placeholder="Ask about a topic, request a quiz, or paste a question…"
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
