import { useState } from "react";
import { useSpace } from "@/context/SpaceContext";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Loader2, FileText, CheckCircle2, Lightbulb, BookOpen, RotateCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Summary {
  title: string;
  overview: string;
  keyPoints: string[];
  concepts: { term: string; definition: string }[];
  examTips: string[];
  fullText: string;
}

export default function SummaryPage() {
  const { space } = useSpace();
  const { play } = useSound();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "concepts" | "tips" | "full">("overview");

  const material = space?.materialText ?? "";

  async function generate() {
    if (!material) return;
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
    } catch { play("error"); }
    finally { setLoading(false); }
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
        <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Summary</h1>
          <p className="text-sm text-muted-foreground">Structured summaries with key points and exam tips</p>
        </div>
      </div>

      {!material ? (
        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="font-medium mb-1">No study material in this space</p>
          <p className="text-sm text-muted-foreground">Edit this space and paste your study material first.</p>
        </div>
      ) : !summary ? (
        <div className="paper-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Topic focus <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              className="w-full text-sm bg-muted border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              placeholder="e.g. cell division, the French Revolution..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <SoundButton onClick={generate} disabled={loading} className="w-full" size="lg">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {loading ? "Generating summary..." : "Generate Summary"}
          </SoundButton>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold gradient-text">{summary.title}</h2>
            <SoundButton variant="ghost" size="sm" onClick={() => { setSummary(null); play("click"); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> New Summary
            </SoundButton>
          </div>

          <div className="paper-inset px-4 py-3 mb-6 text-sm text-muted-foreground leading-relaxed">
            {summary.overview}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onMouseEnter={() => play("hover")}
                onClick={() => { play("click"); setActiveTab(key); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  activeTab === key
                    ? "bg-card text-foreground shadow-sm border border-border paper-shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <ScrollArea className="h-[420px]">
            {activeTab === "overview" && (
              <div className="space-y-3 pr-3">
                {summary.keyPoints.map((point, i) => (
                  <div key={i} className="flex gap-3 p-3.5 rounded-xl paper-card">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "concepts" && (
              <div className="space-y-3 pr-3">
                {summary.concepts.map((c, i) => (
                  <div key={i} className="p-4 rounded-xl paper-card">
                    <div className="font-semibold text-primary mb-1.5 text-sm">{c.term}</div>
                    <div className="text-sm text-muted-foreground">{c.definition}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "tips" && (
              <div className="space-y-3 pr-3">
                {summary.examTips.map((tip, i) => (
                  <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">{tip}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "full" && (
              <div className="pr-3">
                <div className="p-5 rounded-xl paper-card">
                  <MarkdownRenderer content={summary.fullText} />
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
