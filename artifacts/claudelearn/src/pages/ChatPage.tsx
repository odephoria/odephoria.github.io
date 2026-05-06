import { useState, useRef, useEffect, useCallback } from "react";
import { useSpace } from "@/context/SpaceContext";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useSound } from "@/hooks/use-sound";
import { Send, Bot, User, Loader2, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message { id: number; role: string; content: string; streaming?: boolean; }

export default function ChatPage() {
  const { space } = useSpace();
  const { play } = useSound();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!space?.conversationId) return;
    try {
      const res = await fetch(`/api/anthropic/conversations/${space.conversationId}/messages`);
      if (res.ok) { setMessages(await res.json()); setLoaded(true); }
    } catch {}
  }, [space?.conversationId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const systemPrompt = space ? `You are Odephoria, a helpful AI study tutor. The student is studying: "${space.name}".

${space.materialText ? `Study material:\n${space.materialText.slice(0, 6000)}\n\n` : ""}Rules:
- Use **bold** for key terms and important concepts
- Use markdown headers (## ) when explaining structured topics
- Never use emojis — use plain text formatting only
- Be educational, precise, and engaging
- Give examples and analogies to make abstract concepts concrete
- Keep responses focused and relevant to the study material` : "";

  async function send() {
    if (!input.trim() || !space?.conversationId || streaming) return;
    const content = input.trim();
    setInput("");
    play("send");

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content }]);
    setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    try {
      const res = await fetch(`/api/anthropic/conversations/${space.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, systemPrompt }),
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n").filter((l) => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) setMessages((prev) => prev.map((m) => m.streaming ? { ...m, content: m.content + data.content } : m));
            if (data.done) play("receive");
          } catch {}
        }
      }
    } catch { play("error"); }
    finally { setStreaming(false); setMessages((prev) => prev.map((m) => ({ ...m, streaming: false }))); }
  }

  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  if (!space?.conversationId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="font-medium">No conversation linked to this space</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-5">
          {!loaded && (
            <div className="flex justify-center pt-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          )}
          {loaded && messages.length === 0 && (
            <div className="text-center pt-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Bot className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold">Ask Odephoria anything</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {space.materialText ? "I have access to your study material. Ask me to explain, quiz you, or clarify anything." : "Ask me any question and I'll help you understand."}
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-card-border rounded-tl-sm paper-shadow"
              )}>
                {msg.role === "assistant" ? (
                  <>
                    {msg.streaming && !msg.content ? (
                      <div className="flex gap-1.5 py-1">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <MarkdownRenderer content={msg.content} />
                        {msg.streaming && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-card/60 px-6 py-3">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Textarea
            className="flex-1 resize-none bg-muted border-border focus:border-primary/50 text-sm min-h-[52px] max-h-[180px]"
            placeholder="Ask about your study material... (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            onMouseEnter={() => play("hover")}
            className="w-12 h-12 mt-auto rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:brightness-95 transition-all paper-shadow"
          >
            {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
