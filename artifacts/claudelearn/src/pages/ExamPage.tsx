import { useState } from "react";
import { useSpace } from "@/context/SpaceContext";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronLeft, RotateCcw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question { question: string; options: string[]; answer: number; explanation: string; difficulty?: string; }
interface WrongAnswer { question: string; yourAnswer: string; correctAnswer: string; }

type Phase = "start" | "exam" | "review" | "results";

export default function ExamPage() {
  const { space } = useSpace();
  const { play } = useSound();
  const [phase, setPhase] = useState<Phase>("start");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [gapResult, setGapResult] = useState<{ weakAreas: { topic: string; severity: string; recommendation: string }[]; overallScore: number; studyPriorities: string[] } | null>(null);

  const material = space?.materialText ?? "";

  async function startExam() {
    if (!material) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, count }),
      });
      const data = await res.json();
      setQuestions(data);
      setSelected(new Array(data.length).fill(null));
      setCurrent(0);
      setPhase("exam");
      play("success");
    } catch { play("error"); }
    finally { setLoading(false); }
  }

  async function submitExam() {
    play("click");
    setPhase("review");
  }

  async function finalSubmit() {
    setAnalyzing(true);
    play("click");
    const wrongAnswers: WrongAnswer[] = questions
      .map((q, i) => {
        const sel = selected[i];
        if (sel === null || sel === q.answer) return null;
        return { question: q.question, yourAnswer: q.options[sel] ?? "Not answered", correctAnswer: q.options[q.answer] };
      })
      .filter(Boolean) as WrongAnswer[];

    if (wrongAnswers.length === 0) {
      setGapResult({ weakAreas: [], overallScore: 1, studyPriorities: [] });
      setAnalyzing(false);
      setPhase("results");
      play("success");
      return;
    }

    try {
      const res = await fetch("/api/study/gap-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, wrongAnswers }),
      });
      const data = await res.json();
      setGapResult(data);
      setPhase("results");
      play("success");
    } catch { play("error"); }
    finally { setAnalyzing(false); }
  }

  function reset() {
    setPhase("start");
    setQuestions([]);
    setSelected([]);
    setCurrent(0);
    setGapResult(null);
    play("click");
  }

  const answered = selected.filter((s) => s !== null).length;
  const score = questions.length > 0 ? questions.filter((q, i) => selected[i] === q.answer).length : 0;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  /* — START — */
  if (phase === "start") {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Exam Mode</h1>
            <p className="text-sm text-muted-foreground">Answer questions without seeing the correct answers. Get AI feedback at the end.</p>
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
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <strong>Exam conditions apply:</strong> Correct answers are hidden until the end. The AI will analyse your performance and show you exactly where to improve.
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Number of questions</label>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => play("hover")}
                    onClick={() => { play("click"); setCount(n); }}
                    className={cn(
                      "px-4 py-1.5 rounded-lg border text-sm font-medium transition-all",
                      count === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 text-foreground"
                    )}
                  >{n}</button>
                ))}
              </div>
            </div>
            <SoundButton onClick={startExam} disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
              {loading ? "Generating exam..." : "Start Exam"}
            </SoundButton>
          </div>
        )}
      </div>
    );
  }

  /* — EXAM — */
  if (phase === "exam") {
    const q = questions[current];
    const prog = (answered / questions.length) * 100;
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</span>
          <span className="text-sm font-medium">{answered} answered</span>
        </div>
        <Progress value={prog} className="h-1.5 mb-8" />

        <div className="paper-card p-6 mb-6">
          <p className="text-base font-medium leading-relaxed">{q.question}</p>
        </div>

        <div className="space-y-3 mb-8">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onMouseEnter={() => play("hover")}
              onClick={() => {
                play("click");
                setSelected((prev) => { const next = [...prev]; next[current] = idx; return next; });
              }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                selected[current] === idx
                  ? "border-primary bg-primary/8 text-foreground"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs font-bold mr-3">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <SoundButton variant="outline" onClick={() => { play("click"); setCurrent((c) => Math.max(0, c - 1)); }} disabled={current === 0}>
            <ChevronLeft className="w-4 h-4" />
          </SoundButton>
          {current < questions.length - 1 ? (
            <SoundButton className="flex-1" onClick={() => { play("click"); setCurrent((c) => c + 1); }}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </SoundButton>
          ) : (
            <SoundButton className="flex-1" onClick={submitExam}>
              Review Answers
            </SoundButton>
          )}
        </div>
      </div>
    );
  }

  /* — REVIEW — */
  if (phase === "review") {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h2 className="text-xl font-bold mb-2">Review your answers</h2>
        <p className="text-sm text-muted-foreground mb-6">Change any answer before final submission.</p>
        <ScrollArea className="h-[55vh] mb-6">
          <div className="space-y-4 pr-2">
            {questions.map((q, i) => (
              <div key={i} className="paper-card p-4">
                <p className="text-sm font-medium mb-3 leading-relaxed">{i + 1}. {q.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onMouseEnter={() => play("hover")}
                      onClick={() => { play("click"); setSelected((prev) => { const next = [...prev]; next[i] = idx; return next; }); }}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg border text-xs transition-all",
                        selected[i] === idx ? "border-primary bg-primary/8" : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="font-bold mr-1.5">{String.fromCharCode(65 + idx)}.</span>{opt}
                    </button>
                  ))}
                </div>
                {selected[i] === null && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Unanswered
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-3">
          <SoundButton variant="outline" onClick={() => { play("click"); setPhase("exam"); setCurrent(0); }}>
            Back to Exam
          </SoundButton>
          <SoundButton className="flex-1" onClick={finalSubmit} disabled={analyzing}>
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            {analyzing ? "Analysing results..." : "Submit & Get Feedback"}
          </SoundButton>
        </div>
      </div>
    );
  }

  /* — RESULTS — */
  const wrongCount = questions.filter((q, i) => selected[i] !== null && selected[i] !== q.answer).length;
  const skippedCount = selected.filter((s) => s === null).length;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold",
          pct >= 80 ? "bg-green-100 border-2 border-green-300 text-green-700" :
          pct >= 60 ? "bg-amber-100 border-2 border-amber-300 text-amber-700" :
          "bg-red-100 border-2 border-red-300 text-red-700"
        )}>
          {pct}%
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {pct >= 90 ? "Outstanding result" : pct >= 75 ? "Good effort" : pct >= 60 ? "Getting there" : "Needs more work"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {score} correct · {wrongCount} wrong · {skippedCount} skipped
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {/* Per-question results */}
        <h3 className="font-semibold text-sm">Question breakdown</h3>
        {questions.map((q, i) => {
          const sel = selected[i];
          const correct = sel === q.answer;
          const skipped = sel === null;
          return (
            <div key={i} className={cn("paper-card p-4", correct ? "border-green-200 bg-green-50/50" : skipped ? "border-amber-200 bg-amber-50/30" : "border-red-200 bg-red-50/30")}>
              <div className="flex gap-2 items-start">
                {correct ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> :
                 skipped ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> :
                 <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">{q.question}</p>
                  {!correct && !skipped && (
                    <p className="text-xs text-muted-foreground">Your answer: <span className="text-red-600">{sel !== null ? q.options[sel] : "—"}</span></p>
                  )}
                  <p className="text-xs text-muted-foreground">Correct: <span className="text-green-700 font-medium">{q.options[q.answer]}</span></p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* AI gap analysis */}
        {gapResult && gapResult.weakAreas.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> AI Improvement Plan
            </h3>
            <div className="space-y-3">
              {gapResult.weakAreas.map((area, i) => (
                <div key={i} className={cn("paper-card p-4", {
                  "border-red-200 bg-red-50/40": area.severity === "high",
                  "border-amber-200 bg-amber-50/40": area.severity === "medium",
                  "border-blue-200 bg-blue-50/40": area.severity === "low",
                })}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{area.topic}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", {
                      "border-red-300 text-red-700 bg-red-100": area.severity === "high",
                      "border-amber-300 text-amber-700 bg-amber-100": area.severity === "medium",
                      "border-blue-300 text-blue-700 bg-blue-100": area.severity === "low",
                    })}>{area.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{area.recommendation}</p>
                </div>
              ))}
              {gapResult.studyPriorities.length > 0 && (
                <div className="paper-card p-4">
                  <p className="text-sm font-medium mb-2">Study priorities</p>
                  <ul className="space-y-1">
                    {gapResult.studyPriorities.map((p, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary font-bold">{i + 1}.</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        {gapResult && gapResult.weakAreas.length === 0 && (
          <div className="paper-card p-5 border-green-200 bg-green-50/50 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-800">No significant gaps found</p>
            <p className="text-sm text-green-700">You answered everything correctly. Excellent work.</p>
          </div>
        )}
      </div>

      <SoundButton variant="outline" onClick={reset} className="w-full">
        <RotateCcw className="w-4 h-4 mr-2" /> Take Another Exam
      </SoundButton>
    </div>
  );
}
