import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSpace } from "@/context/SpaceContext";
import { useTheme } from "@/context/ThemeContext";
import { useTokens } from "@/context/TokenContext";
import { useSound } from "@/hooks/use-sound";
import { Loader2, Youtube, ChevronDown, ChevronUp, Sun, Moon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatPage from "@/pages/ChatPage";
import QuizPage from "@/pages/QuizPage";
import FlashcardsPage from "@/pages/FlashcardsPage";
import SummaryPage from "@/pages/SummaryPage";
import ExamPage from "@/pages/ExamPage";
import ProgressPage from "@/pages/ProgressPage";
import PomodoroPage from "@/pages/PomodoroPage";
import StudyPlanPage from "@/pages/StudyPlanPage";

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return m ? m[1] : null;
}

const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  chat: ChatPage,
  quiz: QuizPage,
  flashcards: FlashcardsPage,
  summary: SummaryPage,
  exam: ExamPage,
  progress: ProgressPage,
  pomodoro: PomodoroPage,
  "study-plan": StudyPlanPage,
};

function TokenBadge() {
  const { remaining, isLow, isVeryLow, isDepleted } = useTokens();
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
      isDepleted ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400" :
      isVeryLow  ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 animate-pulse" :
      isLow      ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" :
      "border-border bg-card text-muted-foreground"
    )}>
      <Zap className="w-3 h-3" />
      {isDepleted ? "Out of tokens" : `~${fmt(remaining)} left`}
    </div>
  );
}

export default function StudyLayout() {
  const { id, page = "chat" } = useParams<{ id: string; page: string }>();
  const spaceId = parseInt(id ?? "0");
  const { space, setSpace, updateLastPage } = useSpace();
  const { play } = useSound();
  const { theme, toggle: toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!spaceId || isNaN(spaceId)) { navigate("/"); return; }
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/study/spaces/${spaceId}`);
        if (!res.ok) { navigate("/"); return; }
        const data = await res.json();
        setSpace(data);
      } catch { navigate("/"); }
      finally { setLoading(false); }
    };
    load();
  }, [spaceId]);

  useEffect(() => {
    if (space && page) updateLastPage(spaceId, page);
  }, [page, spaceId]);

  // Navigation handler called by ChatSidebar/ChatPage when Claude requests [GOTO:xxx]
  const handleNavigate = useCallback((targetPage: string) => {
    if (PAGE_COMPONENTS[targetPage]) {
      navigate(`/space/${spaceId}/${targetPage}`);
    }
  }, [spaceId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!space) return null;

  const ytId = space.youtubeUrl ? getYouTubeId(space.youtubeUrl) : null;
  const PageComponent = PAGE_COMPONENTS[page] ?? ChatPage;
  const isChat = page === "chat";
  const sidebarOffset = chatOpen && !isChat ? "mr-80" : "";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar spaceId={spaceId} currentPage={page} />

      <div className={`flex-1 flex flex-col overflow-hidden ml-14 transition-all duration-300 ${sidebarOffset}`}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{space.name}</span>
            {space.description && (
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">— {space.description}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!space.materialText && (
              <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                No material
              </span>
            )}
            {ytId && (
              <button
                onClick={() => { play("click"); setVideoOpen((v) => !v); }}
                onMouseEnter={() => play("hover")}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors"
              >
                <Youtube className="w-3.5 h-3.5" />
                {videoOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <TokenBadge />
            <button
              onClick={() => { play("click"); toggleTheme(); }}
              onMouseEnter={() => play("hover")}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* YouTube embed */}
        {ytId && videoOpen && (
          <div className="shrink-0 border-b border-border bg-black">
            <div className="aspect-video max-h-64">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${ytId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <PageComponent />
          </ErrorBoundary>
        </main>
      </div>

      {!isChat && (
        <ChatSidebar
          isOpen={chatOpen}
          onToggle={() => { play("click"); setChatOpen((o) => !o); }}
          onNavigate={handleNavigate}
          spaceId={spaceId}
        />
      )}
    </div>
  );
}
