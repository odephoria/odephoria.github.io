import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useDeleteAnthropicConversation,
  getListAnthropicConversationsQueryKey,
} from "@workspace/api-client-react";
import type { AnthropicConversation, AnthropicMessage } from "@workspace/api-client-react";
import { SoundButton } from "@/components/SoundButton";
import { useSound } from "@/hooks/use-sound";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Send, Bot, User, Loader2 } from "lucide-react";

interface Message extends AnthropicMessage {
  streaming?: boolean;
}

export default function ChatPage() {
  const { play } = useSound();
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useListAnthropicConversations();
  const createConv = useCreateAnthropicConversation();
  const deleteConv = useDeleteAnthropicConversation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(id: number) {
    setActiveConvId(id);
    play("click");
    const res = await fetch(`/api/anthropic/conversations/${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  async function handleNewConversation() {
    const title = newConvTitle.trim() || "New conversation";
    const conv = await createConv.mutateAsync({ data: { title } });
    await qc.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    setActiveConvId(conv.id);
    setMessages([]);
    setNewConvTitle("");
    play("success");
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    play("error");
    await deleteConv.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  }

  async function handleSend() {
    if (!input.trim() || !activeConvId || streaming) return;
    const userContent = input.trim();
    setInput("");
    play("send");

    const userMsg: Message = {
      id: Date.now(),
      conversationId: activeConvId,
      role: "user",
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const aiMsg: Message = {
      id: Date.now() + 1,
      conversationId: activeConvId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      streaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`/api/anthropic/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userContent }),
      });

      if (!res.body) throw new Error("No stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.streaming ? { ...m, content: m.content + data.content } : m
                )
              );
            }
            if (data.done) play("receive");
          } catch {}
        }
      }
    } catch {
      play("error");
    } finally {
      setStreaming(false);
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })));
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-card/50"
        style={{ flexShrink: 0 }}>
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Conversations</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm bg-muted border border-border rounded-md px-2 py-1 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              placeholder="Topic..."
              value={newConvTitle}
              onChange={(e) => setNewConvTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNewConversation()}
            />
            <SoundButton size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleNewConversation}>
              <Plus className="w-4 h-4" />
            </SoundButton>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {(conversations as AnthropicConversation[]).map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                onMouseEnter={() => play("hover")}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all text-sm",
                  activeConvId === conv.id
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(conversations as AnthropicConversation[]).length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                Create a conversation to start chatting
              </p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Select or create a conversation</h2>
              <p className="text-muted-foreground text-sm">Ask Claude anything about your study material</p>
              <SoundButton onClick={handleNewConversation}>
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </SoundButton>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    )}>
                      {msg.streaming && !msg.content ? (
                        <div className="flex gap-1 py-1">
                          <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">
                          {msg.content}
                          {msg.streaming && <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse" />}
                        </div>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border p-4">
              <div className="max-w-3xl mx-auto flex gap-3">
                <Textarea
                  className="flex-1 resize-none bg-muted border-border focus:border-primary/50 min-h-[52px] max-h-[200px] text-sm"
                  placeholder="Ask Claude about your study material... (Enter to send, Shift+Enter for newline)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                />
                <SoundButton
                  size="icon"
                  className="h-[52px] w-[52px] shrink-0"
                  disabled={streaming || !input.trim()}
                  onClick={handleSend}
                  soundOnClick={false}
                >
                  {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </SoundButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
