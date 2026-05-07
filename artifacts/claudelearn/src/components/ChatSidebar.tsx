import { useState, useRef, useEffect, useCallback } from "react";
import { useSpace } from "@/context/SpaceContext";
import { useTokens, estimateTokens } from "@/context/TokenContext";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useSound } from "@/hooks/use-sound";
import { MessageSquare, Send, ChevronRight, Loader2, Bot, User, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { id: number; role: string; content: string; streaming?: boolean; }

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (page: string) => void;
  spaceId: number;
}

const GOTO_RE = /\[GOTO:([a-z-]+)\]/gi;

function buildSystemPrompt(space: { name: string; materialText?: string | null }) {
  return `You are Odephoria, a helpful AI study tutor. The student is studying: "${space.name}".

${space.materialText ? `Study material:\n${space.materialText.slice(0, 6000)}\n` : ""}
## Formatting (always follow):
- Never use emojis — plain text only
- Use **bold** for key terms and important concepts
- Use markdown headers (## or ###) for structured explanations
- Be educational, precise, and engaging

## Navigation commands (ONLY use when explicitly requested):
When the student asks you to open a specific tool, include EXACTLY ONE of these tags anywhere in your response:
[GOTO:quiz] — student says "quiz me", "test me", "give me questions", "practise questions"
[GOTO:flashcards] — student says "make flashcards", "flashcards", "flash cards"
[GOTO:summary] — student says "summarise", "summary", "give me a summary"
[GOTO:exam] — student says "exam mode", "exam", "test me properly", "exam practice"
[GOTO:study-plan] — student says "study plan", "plan my study", "make a plan"
[GOTO:pomodoro] — student says "timer", "pomodoro", "start a timer"
[GOTO:progress] — student says "my progress", "how am I doing", "stats"

Do NOT use navigation tags for normal questions or explanations. Only navigate when the student explicitly requests a tool.`;
}

export function ChatSidebar({ isOpen, onToggle, onNavigate, spaceId }: Props) {
  const { space } = useSpace();
  const { play } = useSound();
  const { isDepleted, isVeryLow, addTokens, resetDate } = useTokens();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const loadMessages = useCallback(async () => {
    if (!space?.conversationId) return;
    setLoadError(false);
    try {
      const res = await fetch(`/api/anthropic/conversations/${space.conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setLoaded(true);
      } else {
        setLoadError(true);
      }
    } catch { setLoadError(true); }
  }, [space?.conversationId]);

  useEffect(() => {
    if (isOpen && !loaded) loadMessages();
  }, [isOpen, loaded, loadMessages]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  async function send() {
    if (!input.trim() || !space?.conversationId || streaming) return;
    if (isDepleted) return;
    const content = input.trim();
    setInput("");
    play("send");

    addTokens(estimateTokens(content));

    const userMsg: Message = { id: Date.now(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    const aiMsg: Message = { id: Date.now() + 1, role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, aiMsg]);
    setStreaming(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let full = "";
    try {
      const systemPrompt = buildSystemPrompt(space) + (isVeryLow ? "\n\nIMPORTANT: Token limit is almost reached. Give the most essential information concisely. End your response with: \"Note: Odephoria is running very low on tokens. Tokens reset tomorrow at midnight.\"" : "");

      const res = await fetch(`/api/anthropic/conversations/${space.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, systemPrompt }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");
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
              // Check for navigation commands
              const gotoMatch = full.match(/\[GOTO:([a-z-]+)\]/i);
              if (gotoMatch) {
                const targetPage = gotoMatch[1].toLowerCase();
                setTimeout(() => onNavigate(targetPage), 600);
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      play("error");
      setMessages((prev) => prev.map((m) => m.streaming ? { ...m, content: "Sorry, something went wrong. Please try again.", streaming: false } : m));
    } finally {
      setStreaming(false);
      setMessages((prev) => prev.map((m) => ({ ...m, streaming: false })));
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        onMouseEnter={() => play("hover")}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 px-1.5 py-3 rounded-l-lg transition-all duration-300",
          "bg-primary text-primary-foreground paper-shadow hover:brightness-95",
          isOpen ? "right-80" : "right-0"
        )}
        title={isOpen ? "Close tutor" : "Open tutor"}
      >
        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
        {!isOpen && (
          <span className="text-xs font-medium" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
            Tutor
          </span>
        )}
      </button>

      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 h-full flex flex-col transition-all duration-300 z-30 border-l border-border bg-card",
        isOpen ? "w-80 translate-x-0" : "w-80 translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Tutor</div>
            {space && <div className="text-xs text-muted-foreground truncate">{space.name}</div>}
          </div>
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {!loaded && !loadError && (
            <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          )}
          {loadError && (
            <div className="flex flex-col items-center gap-2 pt-8 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-xs text-muted-foreground">Could not load messages.</p>
              <button onClick={loadMessages} className="text-xs text-primary hover:underline">Retry</button>
            </div>
          )}
          {loaded && messages.length === 0 && (
            <div className="text-center pt-8 space-y-2">
              <Bot className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">Ask anything — or say "quiz me" to navigate to a tool.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-xs",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted border border-border rounded-tl-sm"
              )}>
                {msg.role === "assistant" ? (
                  <>
                    {msg.streaming && !msg.content ? (
                      <div className="flex gap-1 py-0.5">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <MarkdownRenderer content={msg.content} />
                        {msg.streaming && <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse" />}
                      </>
                    )}
                  </>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0">
          {isDepleted ? (
            <div className="flex flex-col items-center gap-1.5 py-3 text-center">
              <Zap className="w-5 h-5 text-red-500" />
              <p className="text-xs font-semibold text-red-600">Odephoria has run out of tokens</p>
              <p className="text-xs text-muted-foreground">Tokens reset {resetDate}. Come back then to continue your studies.</p>
            </div>
          ) : !space?.conversationId ? (
            <p className="text-xs text-muted-foreground text-center py-2">Enter a study space to chat.</p>
          ) : (
            <div className="flex gap-2">
              <textarea
                className="flex-1 resize-none bg-muted border border-border rounded-lg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors min-h-[52px] max-h-[120px]"
                placeholder="Ask anything, or say 'quiz me'..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                onMouseEnter={() => play("hover")}
                className="w-9 h-9 mt-auto rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:brightness-95 transition-all"
              >
                {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
