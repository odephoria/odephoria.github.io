import { useState } from "react";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Map, Loader2, RotateCcw, CheckCircle2, Clock } from "lucide-react";

interface StudyPlanSession {
  day: number;
  focus: string;
  activities: string[];
  duration: string;
}

interface StudyPlan {
  title: string;
  totalDays: number;
  sessions: StudyPlanSession[];
}

export default function StudyPlanPage() {
  const { play } = useSound();
  const [material, setMaterial] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());

  async function generate() {
    if (!material.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, goal, daysAvailable: days }),
      });
      const data = await res.json();
      setPlan(data);
      setCompletedDays(new Set());
      play("success");
    } catch {
      play("error");
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: number) {
    play(completedDays.has(day) ? "click" : "correct");
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  const dayColors = [
    "hsl(271 81% 66%)",
    "hsl(285 70% 60%)",
    "hsl(200 80% 58%)",
    "hsl(320 70% 60%)",
    "hsl(160 65% 50%)",
    "hsl(40 90% 60%)",
    "hsl(200 80% 58%)",
  ];

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(200 80% 58% / 0.15)" }}>
            <Map className="w-5 h-5" style={{ color: "hsl(200 80% 58%)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Study Plan Generator</h1>
            <p className="text-muted-foreground text-sm">Get a personalized multi-day study roadmap</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Study Material</label>
            <Textarea
              className="min-h-[180px] bg-muted border-border focus:border-primary/50 text-sm"
              placeholder="Paste your study material, syllabus, or list of topics..."
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Study Goal (optional)</label>
              <input
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. pass final exam"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Days Available</label>
              <select
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[3, 5, 7, 10, 14, 21, 30].map((n) => (
                  <option key={n} value={n}>{n} days</option>
                ))}
              </select>
            </div>
          </div>
          <SoundButton onClick={generate} disabled={loading || !material.trim()} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Map className="w-4 h-4 mr-2" />}
            {loading ? "Generating plan..." : "Generate Study Plan"}
          </SoundButton>
        </div>
      </div>
    );
  }

  const progress = Math.round((completedDays.size / plan.sessions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold gradient-text">{plan.title}</h2>
          <p className="text-sm text-muted-foreground">{plan.totalDays}-day plan · {completedDays.size} days completed</p>
        </div>
        <SoundButton variant="ghost" size="sm" onClick={() => { setPlan(null); play("click"); }}>
          <RotateCcw className="w-4 h-4 mr-1" /> New Plan
        </SoundButton>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "hsl(var(--primary))" }}
          />
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {plan.sessions.map((session, i) => {
            const color = dayColors[i % dayColors.length];
            const done = completedDays.has(session.day);
            return (
              <div
                key={session.day}
                className={`rounded-2xl border p-5 transition-all duration-200 ${
                  done ? "opacity-60 border-border" : "border-border hover:border-primary/30 card-glow"
                }`}
                style={{ background: done ? "hsl(var(--muted))" : "hsl(var(--card))" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: `${color}20`, color }}>
                      {session.day}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{session.focus}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        {session.duration}
                      </div>
                    </div>
                  </div>
                  <button
                    onMouseEnter={() => play("hover")}
                    onClick={() => toggleDay(session.day)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      done
                        ? "bg-green-500 text-white"
                        : "border border-border hover:border-primary/50 text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {session.activities.map((act, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                      {act}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {completedDays.size === plan.sessions.length && (
        <div className="mt-6 p-4 rounded-xl bg-green-900/20 border border-green-700/30 text-green-400 text-center">
          You completed the entire study plan!
        </div>
      )}
    </div>
  );
}
