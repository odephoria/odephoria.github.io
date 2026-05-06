import { useState, useCallback } from "react";
import { useSpace } from "@/context/SpaceContext";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy, ChevronRight, Shuffle, Plus, AlertTriangle } from "lucide-react";

interface QuizQuestion { question: string; options: string[]; answer: number; explanation: string; difficulty?: string; }

type Phase = "setup" | "quiz" | "results";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const { space } = useSpace();
  const { play } = useSound();
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const material = space?.materialText ?? "";

  const generateQuestions = useCallback(async (append = false) => {
    if (!material) return;
    if (append) setExtending(true); else setLoading(true);
    try {
      const res = await fetch("/api/study/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, count }),
      });
      const data: QuizQuestion[] = await res.json();
      if (append) {
        setQuestions((prev) => [...prev, ...data]);
      } else {
        setQuestions(data);
        setCurrent(0);
        setSelected(null);
        setAnswers([]);
        setShowExplanation(false);
        setPhase("quiz");
        play("success");
      }
    } catch { play("error"); }
    finally { setLoading(false); setExtending(false); }
  }, [material, count, play]);

  function shuffleQuestions() {
    play("click");
    setQuestions((q) => shuffle(q));
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setShowExplanation(false);
  }

  function selectAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].answer;
    play(correct ? "correct" : "wrong");
    setAnswers((prev) => [...prev, { selected: idx, correct }]);
    setShowExplanation(true);
  }

  function next() {
    play("click");
    if (current + 1 >= questions.length) { setPhase("results"); play("success"); }
    else { setCurrent((c) => c + 1); setSelected(null); setShowExplanation(false); }
  }

  function restart() { setPhase("setup"); setQuestions([]); setAnswers([]); setCurrent(0); setSelected(null); setShowExplanation(false); play("click"); }

  const score = answers.filter((a) => a.correct).length;

  /* — SETUP — */
  if (phase === "setup") {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quiz</h1>
            <p className="text-sm text-muted-foreground">AI-generated questions from your study material</p>
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
            <div>
              <label className="text-sm font-medium mb-2.5 block">Number of questions</label>
              <div className="flex gap-2 flex-wrap">
                {[4, 6, 8, 10, 12, 15].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => play("hover")}
                    onClick={() => { play("click"); setCount(n); }}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all",
                      count === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
                    )}
                  >{n}</button>
                ))}
              </div>
            </div>
            <SoundButton onClick={() => generateQuestions(false)} disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              {loading ? "Generating questions..." : "Generate Quiz"}
            </SoundButton>
          </div>
        )}
      </div>
    );
  }

  /* — RESULTS — */
  if (phase === "results") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-1">{pct >= 80 ? "Excellent" : pct >= 60 ? "Good work" : "Keep studying"}</h2>
          <p className="text-muted-foreground">{score} of {questions.length} correct</p>
          <div className="text-5xl font-bold text-primary mt-4 mb-6">{pct}%</div>
          <Progress value={pct} className="h-2 mb-8" />
        </div>

        <div className="space-y-2 mb-8">
          {answers.map((a, i) => (
            <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl text-sm", a.correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
              {a.correct ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className="truncate text-foreground">{questions[i]?.question}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <SoundButton variant="outline" className="flex-1" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-2" /> New Quiz
            </SoundButton>
            <SoundButton className="flex-1" onClick={() => { setPhase("quiz"); setCurrent(0); setSelected(null); setAnswers([]); setShowExplanation(false); }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retry Same
            </SoundButton>
          </div>
          <SoundButton variant="outline" onClick={() => { generateQuestions(true); setPhase("quiz"); setCurrent(questions.length); setSelected(null); setShowExplanation(false); }} disabled={extending}>
            {extending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add {count} More Questions
          </SoundButton>
        </div>
      </div>
    );
  }

  /* — QUIZ — */
  const q = questions[current];
  const progress = ((current + (selected !== null ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</span>
        <div className="flex items-center gap-3">
          <button
            title="Shuffle questions"
            onMouseEnter={() => play("hover")}
            onClick={shuffleQuestions}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted border border-border"
          >
            <Shuffle className="w-3 h-3" /> Shuffle
          </button>
          <button
            title="Add more questions"
            onMouseEnter={() => play("hover")}
            onClick={() => generateQuestions(true)}
            disabled={extending}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted border border-border disabled:opacity-40"
          >
            {extending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} {extending ? "Adding..." : "Extend"}
          </button>
          <span className="text-sm font-medium text-primary">{answers.filter((a) => a.correct).length} correct</span>
        </div>
      </div>

      <Progress value={progress} className="h-1.5 mb-7" />

      <div className="paper-card p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-medium leading-relaxed">{q.question}</p>
          {q.difficulty && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full border shrink-0 font-medium", {
              "border-green-300 text-green-700 bg-green-50": q.difficulty === "easy",
              "border-amber-300 text-amber-700 bg-amber-50": q.difficulty === "medium",
              "border-red-300 text-red-700 bg-red-50": q.difficulty === "hard",
            })}>
              {q.difficulty}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mb-5">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === q.answer;
          const revealed = selected !== null;
          return (
            <button
              key={idx}
              onMouseEnter={() => play("hover")}
              onClick={() => selectAnswer(idx)}
              disabled={selected !== null}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200",
                !revealed && "border-border hover:border-primary/50 hover:bg-muted/50",
                revealed && isCorrect && "border-green-400 bg-green-50 text-green-800",
                revealed && isSelected && !isCorrect && "border-red-400 bg-red-50 text-red-700",
                revealed && !isSelected && !isCorrect && "border-border opacity-50",
              )}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs font-bold mr-3 shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
              {revealed && isCorrect && <CheckCircle2 className="inline w-4 h-4 ml-2 text-green-600" />}
              {revealed && isSelected && !isCorrect && <XCircle className="inline w-4 h-4 ml-2 text-red-500" />}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="paper-inset p-4 mb-5 text-sm">
          <p className="font-semibold text-primary mb-1">Explanation</p>
          <p className="text-muted-foreground">{q.explanation}</p>
        </div>
      )}

      {selected !== null && (
        <SoundButton onClick={next} className="w-full" size="lg">
          {current + 1 >= questions.length ? "See Results" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
        </SoundButton>
      )}
    </div>
  );
}
