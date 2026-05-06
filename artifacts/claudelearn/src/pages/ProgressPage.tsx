import { useSound } from "@/hooks/use-sound";
import { useGetStudyProgress } from "@workspace/api-client-react";
import type { StudyProgress } from "@workspace/api-client-react";
import { TrendingUp, Clock, Target, Zap, BarChart2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProgressPage() {
  const { play } = useSound();
  const { data, isLoading } = useGetStudyProgress() as { data: StudyProgress | undefined; isLoading: boolean };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const p = data ?? {
    totalSessions: 0,
    totalMinutes: 0,
    averageScore: 0,
    streakDays: 0,
    recentSessions: [],
    topTopics: [],
  };

  const stats = [
    { label: "Total Sessions", value: p.totalSessions, icon: Zap, color: "hsl(271 81% 66%)" },
    { label: "Minutes Studied", value: p.totalMinutes, icon: Clock, color: "hsl(200 80% 58%)" },
    { label: "Avg Score", value: p.averageScore > 0 ? `${Math.round(p.averageScore * 100)}%` : "—", icon: Target, color: "hsl(160 65% 50%)" },
    { label: "Day Streak", value: p.streakDays, icon: TrendingUp, color: "hsl(40 90% 60%)" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(160 65% 50% / 0.15)" }}>
          <TrendingUp className="w-5 h-5" style={{ color: "hsl(160 65% 50%)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Progress Dashboard</h1>
          <p className="text-muted-foreground text-sm">Track your learning journey</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            onMouseEnter={() => play("hover")}
            className="p-4 rounded-xl bg-card border border-border card-glow text-center"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: `${color}20` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Top Topics */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Top Topics</h3>
          </div>
          {p.topTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sessions yet</p>
          ) : (
            <div className="space-y-3">
              {p.topTopics.map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground truncate flex-1">{t.topic}</span>
                    <span className="text-muted-foreground ml-2">{t.sessions} sessions</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (t.sessions / (p.topTopics[0]?.sessions || 1)) * 100)}%`,
                        background: "hsl(var(--primary))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Recent Sessions</h3>
          {p.recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Complete a quiz to see sessions</p>
          ) : (
            <div className="space-y-2">
              {p.recentSessions.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium truncate max-w-[140px]">{s.topic}</div>
                    <div className="text-xs text-muted-foreground">{s.mode}</div>
                  </div>
                  <div className="text-right">
                    {s.score != null && (
                      <div className={cn("text-sm font-semibold", s.score >= 0.8 ? "text-green-400" : s.score >= 0.6 ? "text-yellow-400" : "text-red-400")}>
                        {Math.round(s.score * 100)}%
                      </div>
                    )}
                    {s.durationMinutes && (
                      <div className="text-xs text-muted-foreground">{s.durationMinutes}m</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {p.totalSessions === 0 && (
        <div className="mt-8 text-center p-8 rounded-2xl bg-card border border-border border-dashed">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-2">No sessions yet</h3>
          <p className="text-sm text-muted-foreground">Complete a quiz or flashcard set to start tracking your progress.</p>
        </div>
      )}
    </div>
  );
}
