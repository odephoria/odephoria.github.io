import { Link } from "wouter";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { MessageSquare, Brain, Layers, FileText, TrendingUp, Timer, Map, Sparkles } from "lucide-react";

const features = [
  { path: "/chat", label: "Tutor Chat", icon: MessageSquare, desc: "Chat with Claude — your personal AI study tutor", color: "hsl(271 81% 66%)" },
  { path: "/quiz", label: "Quiz Mode", icon: Brain, desc: "Generate quizzes from any material and test yourself", color: "hsl(285 70% 60%)" },
  { path: "/flashcards", label: "Flashcards", icon: Layers, desc: "Create and flip through AI-generated flashcards", color: "hsl(200 80% 58%)" },
  { path: "/summary", label: "Summaries", icon: FileText, desc: "Get structured summaries with key points and exam tips", color: "hsl(320 70% 60%)" },
  { path: "/progress", label: "Progress", icon: TrendingUp, desc: "Track your study sessions, scores, and streaks", color: "hsl(160 65% 50%)" },
  { path: "/pomodoro", label: "Pomodoro", icon: Timer, desc: "Focus timer to power through study sessions", color: "hsl(40 90% 60%)" },
  { path: "/study-plan", label: "Study Plan", icon: Map, desc: "Get a personalized multi-day study roadmap", color: "hsl(200 80% 58%)" },
];

export default function HomePage() {
  const { play } = useSound();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by Claude AI
          </div>
          <h1 className="text-5xl font-bold mb-4 gradient-text">ClaudeLearn</h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Your intelligent study companion. Paste any material and let AI transform it into quizzes, flashcards, summaries, and more.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link href="/chat">
              <SoundButton size="lg" className="glow-primary">
                <MessageSquare className="w-5 h-5 mr-2" />
                Start Studying
              </SoundButton>
            </Link>
            <Link href="/quiz">
              <SoundButton size="lg" variant="outline">
                <Brain className="w-5 h-5 mr-2" />
                Take a Quiz
              </SoundButton>
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ path, label, icon: Icon, desc, color }) => (
            <Link key={path} href={path}>
              <div
                onMouseEnter={() => play("hover")}
                onClick={() => play("click")}
                className="group p-5 rounded-xl border border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-card card-glow"
                style={{ "--hover-color": color } as React.CSSProperties}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}20`, color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Paste your study material in any tool to get started instantly.</p>
        </div>
      </div>
    </div>
  );
}
