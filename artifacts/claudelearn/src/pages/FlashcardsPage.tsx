import { useState } from "react";
import { useSpace } from "@/context/SpaceContext";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { cn } from "@/lib/utils";
import { Layers, RotateCcw, ChevronLeft, ChevronRight, Loader2, Lightbulb, CheckCheck, X, AlertTriangle, Shuffle } from "lucide-react";

interface Flashcard { front: string; back: string; hint?: string; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const { space } = useSpace();
  const { play } = useSound();
  const [phase, setPhase] = useState<"setup" | "study">("setup");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [review, setReview] = useState<Set<number>>(new Set());

  const material = space?.materialText ?? "";

  async function generate() {
    if (!material) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, topic, count }),
      });
      const data = await res.json();
      setCards(data);
      setCurrent(0);
      setFlipped(false);
      setShowHint(false);
      setMastered(new Set());
      setReview(new Set());
      setPhase("study");
      play("success");
    } catch { play("error"); }
    finally { setLoading(false); }
  }

  function flip() { play("flip"); setFlipped((f) => !f); setShowHint(false); }

  function go(dir: 1 | -1) {
    play("click");
    setFlipped(false);
    setShowHint(false);
    setCurrent((c) => Math.max(0, Math.min(cards.length - 1, c + dir)));
  }

  function markMastered() {
    play("correct");
    setMastered((m) => new Set([...m, current]));
    if (current < cards.length - 1) go(1);
  }

  function markReview() {
    play("wrong");
    setReview((r) => new Set([...r, current]));
    if (current < cards.length - 1) go(1);
  }

  function shuffleCards() {
    play("click");
    setCards((c) => shuffle(c));
    setCurrent(0);
    setFlipped(false);
    setShowHint(false);
    setMastered(new Set());
    setReview(new Set());
  }

  /* — SETUP — */
  if (phase === "setup") {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-accent-foreground" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Flashcards</h1>
            <p className="text-sm text-muted-foreground">AI-generated flashcards from your study material</p>
          </div>
        </div>

        {!material ? (
          <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="font-medium mb-1">No study material in this space</p>
            <p className="text-sm text-muted-foreground">Edit this space and paste your study material first.</p>
          </div>
        ) : (
          <div className="paper-card p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Topic focus <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                  placeholder="e.g. key terms"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Number of cards</label>
                <select
                  className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {[6, 8, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>{n} cards</option>
                  ))}
                </select>
              </div>
            </div>
            <SoundButton onClick={generate} disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
              {loading ? "Generating..." : "Generate Flashcards"}
            </SoundButton>
          </div>
        )}
      </div>
    );
  }

  /* — STUDY — */
  const card = cards[current];
  const total = cards.length;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-4 text-sm">
          <span className="text-green-700 font-medium">{mastered.size} mastered</span>
          <span className="text-muted-foreground">{current + 1} / {total}</span>
          <span className="text-amber-600">{review.size} to review</span>
        </div>
        <div className="flex gap-2">
          <button
            onMouseEnter={() => play("hover")}
            onClick={shuffleCards}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted border border-border transition-colors"
          >
            <Shuffle className="w-3 h-3" /> Shuffle
          </button>
          <SoundButton variant="ghost" size="sm" onClick={() => setPhase("setup")}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Set
          </SoundButton>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-7 flex-wrap">
        {cards.map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => play("hover")}
            onClick={() => { play("click"); setCurrent(i); setFlipped(false); setShowHint(false); }}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              mastered.has(i) ? "bg-green-500" :
              review.has(i) ? "bg-amber-400" :
              i === current ? "bg-primary scale-125" : "bg-muted-foreground/25 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={flip}
        onMouseEnter={() => play("hover")}
        className="relative cursor-pointer mb-5"
        style={{ perspective: "1000px" }}
      >
        <div
          className={cn(
            "relative w-full min-h-[260px] rounded-2xl paper-card transition-all duration-500",
            mastered.has(current) && "border-green-300 bg-green-50/50",
          )}
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-5 font-medium">Term</div>
            <p className="text-xl font-semibold text-foreground">{card.front}</p>
            <div className="mt-6 text-xs text-muted-foreground">Click to reveal answer</div>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-5 font-medium">Answer</div>
            <p className="text-lg text-foreground leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>

      {/* Hint */}
      {card.hint && (
        <div className="mb-4">
          {!showHint ? (
            <button
              onMouseEnter={() => play("hover")}
              onClick={() => { play("click"); setShowHint(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Lightbulb className="w-3 h-3" /> Show hint
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Lightbulb className="w-3 h-3" /> {card.hint}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <SoundButton variant="outline" size="icon" onClick={() => go(-1)} disabled={current === 0}>
          <ChevronLeft className="w-4 h-4" />
        </SoundButton>
        <SoundButton
          variant="outline"
          className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={markReview}
        >
          <X className="w-4 h-4 mr-2" /> Review Later
        </SoundButton>
        <SoundButton
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={markMastered}
        >
          <CheckCheck className="w-4 h-4 mr-2" /> Mastered
        </SoundButton>
        <SoundButton variant="outline" size="icon" onClick={() => go(1)} disabled={current === cards.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </SoundButton>
      </div>

      {mastered.size === total && (
        <div className="mt-6 text-center p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
          All cards mastered. Outstanding work.
        </div>
      )}
    </div>
  );
}
