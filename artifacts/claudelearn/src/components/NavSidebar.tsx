import { Link } from "wouter";
import { useSound } from "@/hooks/use-sound";
import { MessageSquare, Brain, Layers, FileText, TrendingUp, Timer, Map, ClipboardList, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  spaceId: number;
  currentPage: string;
}

const navItems = [
  { page: "chat", label: "Tutor Chat", icon: MessageSquare },
  { page: "quiz", label: "Quiz", icon: Brain },
  { page: "flashcards", label: "Flashcards", icon: Layers },
  { page: "summary", label: "Summary", icon: FileText },
  { page: "exam", label: "Exam", icon: ClipboardList },
  { page: "progress", label: "Progress", icon: TrendingUp },
  { page: "pomodoro", label: "Pomodoro", icon: Timer },
  { page: "study-plan", label: "Study Plan", icon: Map },
];

export function NavSidebar({ spaceId, currentPage }: Props) {
  const { play } = useSound();

  return (
    <nav
      className="fixed left-0 top-0 h-full w-14 flex flex-col items-center py-3 gap-1 z-50"
      style={{
        background: "hsl(var(--sidebar))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Back to spaces */}
      <Link href="/">
        <button
          title="All Spaces"
          onMouseEnter={() => play("hover")}
          onClick={() => play("click")}
          className="flex items-center justify-center w-9 h-9 rounded-lg mb-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </Link>

      <div className="w-8 h-px bg-border mb-2" />

      {navItems.map(({ page, label, icon: Icon }) => {
        const active = currentPage === page;
        return (
          <Link key={page} href={`/space/${spaceId}/${page}`}>
            <button
              title={label}
              onMouseEnter={() => play("hover")}
              onClick={() => play("click")}
              className={cn(
                "group relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-primary" />
              )}
              <span className={cn(
                "absolute left-12 bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md whitespace-nowrap",
                "opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-border paper-shadow"
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
