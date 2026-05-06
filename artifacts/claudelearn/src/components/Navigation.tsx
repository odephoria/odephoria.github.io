import { Link, useLocation } from "wouter";
import { useSound } from "@/hooks/use-sound";
import {
  BookOpen, MessageSquare, Brain, Layers, FileText,
  TrendingUp, Timer, Map, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Home", icon: Zap },
  { path: "/chat", label: "Tutor Chat", icon: MessageSquare },
  { path: "/quiz", label: "Quiz", icon: Brain },
  { path: "/flashcards", label: "Flashcards", icon: Layers },
  { path: "/summary", label: "Summary", icon: FileText },
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/pomodoro", label: "Pomodoro", icon: Timer },
  { path: "/study-plan", label: "Study Plan", icon: Map },
];

export function Navigation() {
  const [location] = useLocation();
  const { play } = useSound();

  return (
    <nav className="fixed left-0 top-0 h-full w-16 flex flex-col items-center py-4 gap-1 z-50"
      style={{
        background: "hsl(var(--sidebar))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      <div className="mb-4 flex items-center justify-center w-10 h-10 rounded-xl"
        style={{ background: "hsl(var(--primary) / 0.2)" }}>
        <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
      </div>

      {navItems.map(({ path, label, icon: Icon }) => {
        const active = location === path;
        return (
          <Link key={path} href={path}>
            <button
              title={label}
              onMouseEnter={() => play("hover")}
              onClick={() => play("click")}
              className={cn(
                "group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                active
                  ? "bg-primary/20 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r bg-primary" />
              )}
              <span className={cn(
                "absolute left-14 bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md whitespace-nowrap",
                "opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-border shadow-md"
              )}>
                {label}
              </span>
            </button>
          </Link>
        );
      })}
    </nav>
  );
}
