import { useState } from "react";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Layers, RotateCcw, ChevronLeft, ChevronRight, Loader2, Lightbulb, CheckCheck, X } from "lucide-react";

interface Flashcard {
  front: string;
  back: string;
  hint?: string;
}

export default function FlashcardsPage() {
  const { play } = useSound();
  const [phase, setPhase] = useState<"setup" | "study">("setup");
  const [material, setMaterial] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  async function generate() {
    if (!material.trim()) return;
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
      setSkipped(new Set());
      setPhase("study");
      play("success");
    } catch {
      play("error");
    } finally {
      setLoading(false);
    }
  }

  function flip() {
    play("flip");
    setFlipped((f) => !f);
    setShowHint(false);
  }

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

  function markSkipped() {
    play("wrong");
    setSkipped((s) => new Set([...s, current]));
    if (current < cards.length - 1) go(1);
  }

  if (phase === "setup") {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Flashcards</h1>
            <p className="text-muted-foreground text-sm">Create AI-generated flashcards from any material</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Study Material</label>
            <Textarea
              className="min-h-[200px] bg-muted border-border focus:border-primary/50 text-sm"
              placeholder="Paste your study material here..."
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Topic Focus (optional)</label>
              <input
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. key terms"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Number of Cards</label>
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
          <SoundButton onClick={generate} disabled={loading || !material.trim()} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
            {loading ? "Generating..." : "Generate Flashcards"}
          </SoundButton>
        </div>
      </div>
    );
  }

  const card = cards[current];
  const total = cards.length;
  const masteredCount = mastered.size;

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3 text-sm">
          <span className="text-green-400">{masteredCount} mastered</span>
          <span className="text-muted-foreground">{current + 1}/{total}</span>
          <span className="text-yellow-400">{skipped.size} review</span>
        </div>
        <SoundButton variant="ghost" size="sm" onClick={() => setPhase("setup")}>
          <RotateCcw className="w-4 h-4 mr-1" /> New Set
        </SoundButton>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-8 flex-wrap">
        {cards.map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => play("hover")}
            onClick={() => { play("click"); setCurrent(i); setFlipped(false); setShowHint(false); }}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              mastered.has(i) ? "bg-green-500" :
              skipped.has(i) ? "bg-yellow-500" :
              i === current ? "bg-primary scale-125" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={flip}
        onMouseEnter={() => play("hover")}
        className="relative cursor-pointer mb-6"
        style={{ perspective: "1000px" }}
      >
        <div
          className={cn(
            "relative w-full min-h-[260px] rounded-2xl border border-border bg-card card-glow transition-all duration-500",
            mastered.has(current) && "border-green-600/50",
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
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Term</div>
            <p className="text-xl font-semibold">{card.front}</p>
            <div className="mt-6 text-xs text-muted-foreground">Click to reveal answer</div>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Answer</div>
            <p className="text-lg">{card.back}</p>
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
            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2">
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
          className="flex-1 border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/20"
          onClick={markSkipped}
        >
          <X className="w-4 h-4 mr-2" /> Review Later
        </SoundButton>
        <SoundButton
          className="flex-1 bg-green-700 hover:bg-green-600 text-white"
          onClick={markMastered}
        >
          <CheckCheck className="w-4 h-4 mr-2" /> Mastered
        </SoundButton>
        <SoundButton variant="outline" size="icon" onClick={() => go(1)} disabled={current === cards.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </SoundButton>
      </div>

      {masteredCount === total && (
        <div className="mt-6 text-center p-4 rounded-xl bg-green-900/20 border border-green-700/30 text-green-400">
          All cards mastered! Outstanding work.
        </div>
      )}
    </div>
  );
}
