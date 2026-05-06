import { useState } from "react";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, CheckCircle2, Lightbulb, BookOpen, RotateCcw } from "lucide-react";

interface Summary {
  title: string;
  overview: string;
  keyPoints: string[];
  concepts: { term: string; definition: string }[];
  examTips: string[];
  fullText: string;
}

export default function SummaryPage() {
  const { play } = useSound();
  const [material, setMaterial] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "concepts" | "tips" | "full">("overview");

  async function generate() {
    if (!material.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/study/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, topic }),
      });
      const data = await res.json();
      setSummary(data);
      play("success");
    } catch {
      play("error");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: "overview" as const, label: "Key Points", icon: CheckCircle2 },
    { key: "concepts" as const, label: "Concepts", icon: BookOpen },
    { key: "tips" as const, label: "Exam Tips", icon: Lightbulb },
    { key: "full" as const, label: "Full Summary", icon: FileText },
  ];

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-chart-4/20 flex items-center justify-center" style={{ background: "hsl(320 70% 60% / 0.15)" }}>
          <FileText className="w-5 h-5" style={{ color: "hsl(320 70% 60%)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Summary Generator</h1>
          <p className="text-muted-foreground text-sm">Get structured summaries with key points and exam tips</p>
        </div>
      </div>

      {!summary ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Study Material</label>
            <Textarea
              className="min-h-[240px] bg-muted border-border focus:border-primary/50 text-sm"
              placeholder="Paste your textbook chapter, lecture notes, or any study material..."
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Topic Focus (optional)</label>
            <input
              className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              placeholder="e.g. cell division"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <SoundButton onClick={generate} disabled={loading || !material.trim()} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {loading ? "Generating summary..." : "Generate Summary"}
          </SoundButton>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold gradient-text">{summary.title}</h2>
            <SoundButton variant="ghost" size="sm" onClick={() => { setSummary(null); play("click"); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> New Summary
            </SoundButton>
          </div>

          <p className="text-muted-foreground text-sm mb-6 bg-muted rounded-xl p-4 border border-border">
            {summary.overview}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onMouseEnter={() => play("hover")}
                onClick={() => { play("click"); setActiveTab(key); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <ScrollArea className="h-[400px]">
            {activeTab === "overview" && (
              <div className="space-y-3">
                {summary.keyPoints.map((point, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-sm">{point}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "concepts" && (
              <div className="space-y-3">
                {summary.concepts.map((c, i) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border">
                    <div className="font-semibold text-primary mb-1">{c.term}</div>
                    <div className="text-sm text-muted-foreground">{c.definition}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "tips" && (
              <div className="space-y-3">
                {summary.examTips.map((tip, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-yellow-900/15 border border-yellow-700/30">
                    <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "full" && (
              <div className="prose prose-sm prose-invert max-w-none">
                <div className="p-4 rounded-xl bg-card border border-border whitespace-pre-wrap text-sm leading-relaxed">
                  {summary.fullText}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
