import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery } from "@tanstack/react-query";
import { listThreads, listMessages, createThread, deleteThread } from "@/lib/chat.functions";
import { ThreadList } from "./ThreadList";
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
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BookOpen, Plus, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
    messages: (messages as UIMessage[]) ?? [],
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      navigate({ to: "/chat/$threadId", params: { threadId: threads[0].id } });
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

  const isLoading = threadsLoading || messagesLoading || chat.status === "submitted" || chat.status === "streaming";

  return (
    <div className="flex h-screen w-full bg-background">
      <aside className="hidden w-72 flex-col border-r bg-sidebar lg:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sidebar-foreground">StudyMate</span>
        </div>
        <div className="px-3 pb-2">
          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent">
                <Plus className="h-4 w-4" />
                New study session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New study session</DialogTitle>
                <DialogDescription>Pick a subject and title for this session.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Mathematics, Latin, History"
                    value={newThreadSubject}
                    onChange={(e) => setNewThreadSubject(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Topic</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Integral calculus review"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim() || !newThreadSubject.trim()}>
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
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-semibold text-foreground">StudyMate</span>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-muted-foreground">
              {threads?.find((t) => t.id === activeThreadId)?.subject ?? "Study session"}
            </h2>
            <h1 className="text-lg font-semibold text-foreground">
              {threads?.find((t) => t.id === activeThreadId)?.title ?? "Get ready for your exams"}
            </h1>
          </div>
          <div className="lg:hidden">
            <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
              <DialogTrigger asChild>
                <Button size="icon-sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New study session</DialogTitle>
                  <DialogDescription>Pick a subject and title for this session.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="subject-mobile">Subject</Label>
                    <Input
                      id="subject-mobile"
                      placeholder="e.g. Mathematics, Latin, History"
                      value={newThreadSubject}
                      onChange={(e) => setNewThreadSubject(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title-mobile">Topic</Label>
                    <Input
                      id="title-mobile"
                      placeholder="e.g. Integral calculus review"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim() || !newThreadSubject.trim()}>
                    Create session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <Conversation className="h-full">
            <ConversationContent className="px-4 py-6 lg:px-6">
              {chat.messages.length === 0 && !messagesLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Ready to study?</h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Ask me to explain a concept, quiz you, or create a study plan for your next exam.
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => (
                  <Message key={message.id} message={message}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "bg-user text-user-foreground rounded-2xl rounded-tr-sm px-4 py-3"
                          : "bg-transparent text-foreground px-1 py-2"
                      }
                    >
                      {message.role === "assistant" ? (
                        <MessageResponse className="prose-study prose-sm" />
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </MessageContent>
                  </Message>
                ))
              )}
              {(chat.status === "submitted" || chat.status === "streaming") && (
                <div className="px-1 py-2">
                  <Shimmer className="text-muted-foreground" />
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="border-t bg-card p-4 lg:px-6">
          <PromptInput
            onSubmit={(event) => {
              const input = event.value;
              if (!input?.trim()) return;
              chat.sendMessage({ text: input.trim() });
            }}
            disabled={isLoading}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask about a topic, request a quiz, or paste a question..."
                className="min-h-[72px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const value = target.value;
                    if (value.trim()) {
                      chat.sendMessage({ text: value.trim() });
                    }
                  }
                }}
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={chat.status} disabled={isLoading} />
              </PromptInputFooter>
            </PromptInputBody>
          </PromptInput>
        </div>
      </main>
    </div>
  );
}
