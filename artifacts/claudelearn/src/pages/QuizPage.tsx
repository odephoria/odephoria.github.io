import { useState } from "react";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy, ChevronRight } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty?: string;
}

type Phase = "setup" | "quiz" | "results";

export default function QuizPage() {
  const { play } = useSound();
  const [phase, setPhase] = useState<Phase>("setup");
  const [material, setMaterial] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ selected: number; correct: boolean }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  async function generate() {
    if (!material.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, topic, count }),
      });
      const data = await res.json();
      setQuestions(data);
      setCurrent(0);
      setSelected(null);
      setAnswers([]);
      setShowExplanation(false);
      setPhase("quiz");
      play("success");
    } catch {
      play("error");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].answer;
    if (correct) {
      play("correct");
    } else {
      play("wrong");
    }
    setAnswers((prev) => [...prev, { selected: idx, correct }]);
    setShowExplanation(true);
  }

  function next() {
    play("click");
    if (current + 1 >= questions.length) {
      setPhase("results");
      play("success");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  }

  function restart() {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrent(0);
    setSelected(null);
    setShowExplanation(false);
    play("click");
  }

  const score = answers.filter((a) => a.correct).length;

  if (phase === "setup") {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quiz Generator</h1>
            <p className="text-muted-foreground text-sm">Test your knowledge with AI-generated questions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Study Material</label>
            <Textarea
              className="min-h-[200px] bg-muted border-border focus:border-primary/50 text-sm"
              placeholder="Paste your study material, notes, or textbook excerpts here..."
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Topic Focus (optional)</label>
              <input
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. photosynthesis"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Number of Questions</label>
              <select
                className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary/50 transition-colors"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                {[4, 6, 8, 10, 12, 15].map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
          </div>
          <SoundButton onClick={generate} disabled={loading || !material.trim()} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            {loading ? "Generating quiz..." : "Generate Quiz"}
          </SoundButton>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good job!" : "Keep studying!"}</h2>
        <p className="text-muted-foreground mb-6">You scored {score} out of {questions.length}</p>
        <div className="text-6xl font-bold gradient-text mb-8">{pct}%</div>
        <Progress value={pct} className="h-3 mb-8" />
        <div className="space-y-2 mb-8">
          {answers.map((a, i) => (
            <div key={i} className={cn(
              "flex items-center gap-3 p-3 rounded-lg text-sm text-left",
              a.correct ? "bg-green-900/20 border border-green-700/30" : "bg-red-900/20 border border-red-700/30"
            )}>
              {a.correct ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span className="truncate">{questions[i].question}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <SoundButton variant="outline" onClick={restart} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            New Quiz
          </SoundButton>
          <SoundButton onClick={() => { setPhase("quiz"); setCurrent(0); setSelected(null); setAnswers([]); setShowExplanation(false); }} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </SoundButton>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current + (selected !== null ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</span>
        <div className="flex items-center gap-2">
          {q.difficulty && (
            <span className={cn("text-xs px-2 py-0.5 rounded-full border", {
              "border-green-700/50 text-green-400 bg-green-900/20": q.difficulty === "easy",
              "border-yellow-700/50 text-yellow-400 bg-yellow-900/20": q.difficulty === "medium",
              "border-red-700/50 text-red-400 bg-red-900/20": q.difficulty === "hard",
            })}>
              {q.difficulty}
            </span>
          )}
          <span className="text-sm font-medium text-primary">{answers.filter((a) => a.correct).length} correct</span>
        </div>
      </div>

      <Progress value={progress} className="h-1.5 mb-8" />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 card-glow">
        <p className="text-lg font-medium leading-relaxed">{q.question}</p>
      </div>

      <div className="space-y-3 mb-6">
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
                !revealed && "hover:border-primary/50 hover:bg-primary/5 border-border",
                revealed && isCorrect && "border-green-600 bg-green-900/20 text-green-400",
                revealed && isSelected && !isCorrect && "border-red-600 bg-red-900/20 text-red-400",
                revealed && !isSelected && !isCorrect && "border-border opacity-50",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
                {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="bg-muted border border-border rounded-xl p-4 mb-6 text-sm">
          <p className="font-medium text-primary mb-1">Explanation</p>
          <p className="text-muted-foreground">{q.explanation}</p>
        </div>
      )}

      {selected !== null && (
        <SoundButton onClick={next} className="w-full" size="lg">
          {current + 1 >= questions.length ? "See Results" : "Next Question"}
          <ChevronRight className="w-4 h-4 ml-2" />
        </SoundButton>
      )}
    </div>
  );
}
