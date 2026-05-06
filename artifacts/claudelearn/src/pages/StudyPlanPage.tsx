import { useState } from "react";
import { useSpace } from "@/context/SpaceContext";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Map, Loader2, RotateCcw, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { space } = useSpace();
  const { play } = useSound();
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());

  const material = space?.materialText ?? "";

  async function generate() {
    if (!material) return;
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
    } catch { play("error"); }
    finally { setLoading(false); }
  }

  function toggleDay(day: number) {
    play("click");
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
          <Map className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Study Plan</h1>
          <p className="text-sm text-muted-foreground">AI-generated multi-day study roadmap from your material</p>
        </div>
      </div>

      {!material ? (
        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="font-medium mb-1">No study material in this space</p>
          <p className="text-sm text-muted-foreground">Edit this space and paste your study material first.</p>
        </div>
      ) : !plan ? (
        <div className="paper-card p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Study goal <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. prepare for final exam"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Days available</label>
              <select
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[3, 5, 7, 10, 14].map((n) => (
                  <option key={n} value={n}>{n} days</option>
                ))}
              </select>
            </div>
          </div>
          <SoundButton onClick={generate} disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Map className="w-4 h-4 mr-2" />}
            {loading ? "Generating plan..." : "Generate Study Plan"}
          </SoundButton>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">{plan.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedDays.size} of {plan.totalDays} days completed
              </p>
            </div>
            <SoundButton variant="ghost" size="sm" onClick={() => { setPlan(null); play("click"); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> New Plan
            </SoundButton>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-6 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(completedDays.size / plan.totalDays) * 100}%` }}
            />
          </div>

          <ScrollArea className="h-[55vh]">
            <div className="space-y-3 pr-3">
              {plan.sessions.map((session) => {
                const done = completedDays.has(session.day);
                return (
                  <div
                    key={session.day}
                    className={cn(
                      "paper-card p-4 transition-all",
                      done && "border-green-300 bg-green-50/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onMouseEnter={() => play("hover")}
                        onClick={() => toggleDay(session.day)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                          done
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-border hover:border-primary"
                        )}
                      >
                        {done && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Day {session.day}
                          </span>
                          <span className="font-semibold text-sm">{session.focus}</span>
                          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {session.duration}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {session.activities.map((act, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-1 text-xs">–</span>
                              {act}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {completedDays.size === plan.totalDays && (
            <div className="mt-5 text-center p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
              Study plan complete. You are ready.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
