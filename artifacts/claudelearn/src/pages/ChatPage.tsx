import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useSpace } from "@/context/SpaceContext";
import { useTokens, estimateTokens } from "@/context/TokenContext";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useSound } from "@/hooks/use-sound";
import { Send, Bot, User, Loader2, AlertTriangle, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message { id: number; role: string; content: string; streaming?: boolean; }

const GOTO_RE = /\[GOTO:([a-z-]+)\]/gi;

const PAGE_NAMES: Record<string, string> = {
  quiz: "Quiz",
  flashcards: "Flashcards",
  summary: "Summary",
  exam: "Exam",
  "study-plan": "Study Plan",
  pomodoro: "Pomodoro Timer",
  progress: "Progress",
};

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { space } = useSpace();
  const { isDepleted, isVeryLow, addTokens, resetDate } = useTokens();
  const { play } = useSound();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const load = useCallback(async () => {
    if (!space?.conversationId) return;
    try {
      const res = await fetch(`/api/anthropic/conversations/${space.conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setLoaded(true);
      }
    } catch {}
  }, [space?.conversationId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const systemPrompt = space ? `You are Odephoria, a helpful AI study tutor. The student is studying: "${space.name}".

${space.materialText ? `Study material:\n${space.materialText.slice(0, 6000)}\n` : ""}
## Formatting:
- Never use emojis — plain text only
- Use **bold** for key terms and important concepts
- Use markdown headers for structured explanations
- Be educational, precise, and engaging

## Navigation commands (ONLY when explicitly requested):
[GOTO:quiz] — student says "quiz me", "test me", "practise questions"
[GOTO:flashcards] — student says "flashcards", "make flashcards"
[GOTO:summary] — student says "summarise", "give me a summary"
[GOTO:exam] — student says "exam mode", "exam practice"
[GOTO:study-plan] — student says "study plan", "make a plan"
[GOTO:pomodoro] — student says "timer", "pomodoro"
[GOTO:progress] — student says "my progress", "stats"

Do NOT include navigation tags for normal questions. Only navigate when explicitly asked.` : "";

  async function send() {
    if (!input.trim() || !space?.conversationId || streaming || isDepleted) return;
    const content = input.trim();
    setInput("");
    play("send");
    addTokens(estimateTokens(content));

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content }]);
    setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let full = "";
    try {
      const prompt = systemPrompt + (isVeryLow ? "\n\nIMPORTANT: Token limit is almost reached. Be concise. End with: \"Note: Odephoria is running very low on tokens. Tokens reset tomorrow at midnight.\"" : "");

      const res = await fetch(`/api/anthropic/conversations/${space.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, systemPrompt: prompt }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              full += data.content;
              const display = full.replace(GOTO_RE, "").trimEnd();
              setMessages((prev) => prev.map((m) => m.streaming ? { ...m, content: display } : m));
            }
            if (data.done) {
              play("receive");
              addTokens(estimateTokens(full));
              const gotoMatch = full.match(/\[GOTO:([a-z-]+)\]/i);
              if (gotoMatch && id) {
                const targetPage = gotoMatch[1].toLowerCase();
                setNavigatingTo(PAGE_NAMES[targetPage] ?? targetPage);
                setTimeout(() => navigate(`/space/${id}/${targetPage}`), 1200);
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      play("error");
      setMessages((prev) => prev.map((m) => m.streaming ? { ...m, content: "Something went wrong. Please try again.", streaming: false } : m));
    } finally {
      setStreaming(false);
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })));
    }
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
      {navigatingTo && (
        <div className="shrink-0 bg-primary/10 border-b border-primary/20 px-6 py-2 text-sm text-primary font-medium text-center">
          Opening {navigatingTo}...
        </div>
      )}

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
                {space.materialText
                  ? "I have your study material. Try: \"explain the key topics\", \"quiz me\", or \"make flashcards\"."
                  : "Ask me any question and I'll help you understand."}
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
                        {[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
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

      <div className="border-t border-border bg-card/60 px-6 py-3 shrink-0">
        {isDepleted ? (
          <div className="max-w-3xl mx-auto text-center py-3 space-y-1">
            <div className="flex items-center justify-center gap-2 text-red-600 font-semibold text-sm">
              <Zap className="w-4 h-4" />
              Odephoria has run out of tokens for today
            </div>
            <p className="text-xs text-muted-foreground">Come back {resetDate} to continue your studies — the counter resets then.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex gap-3">
            <Textarea
              className="flex-1 resize-none bg-muted border-border focus:border-primary/50 text-sm min-h-[52px] max-h-[180px]"
              placeholder={space.materialText ? "Ask a question, say 'quiz me', 'make flashcards', 'summarise this'..." : "Ask me anything..."}
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
        )}
      </div>
    </div>
  );
}
