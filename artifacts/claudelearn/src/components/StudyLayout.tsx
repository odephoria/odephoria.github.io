import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useSpace } from "@/context/SpaceContext";
import { useSound } from "@/hooks/use-sound";
import { Loader2, Youtube, ChevronDown, ChevronUp } from "lucide-react";
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

export default function StudyLayout() {
  const { id, page = "chat" } = useParams<{ id: string; page: string }>();
  const spaceId = parseInt(id);
  const { space, setSpace, updateLastPage } = useSpace();
  const { play } = useSound();
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [, navigate] = useLocation();

  // Load space on mount / id change
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/study/spaces/${spaceId}`);
        if (!res.ok) { navigate("/"); return; }
        const data = await res.json();
        setSpace(data);
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [spaceId]);

  // Update lastVisitedPage when page changes
  useEffect(() => {
    if (space && page) {
      updateLastPage(spaceId, page);
    }
  }, [page, spaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!space) return null;

  const ytId = space.youtubeUrl ? getYouTubeId(space.youtubeUrl) : null;
  const PageComponent = PAGE_COMPONENTS[page] ?? QuizPage;
  const isChat = page === "chat";
  const sidebarOffset = chatOpen && !isChat ? "mr-80" : "";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavSidebar spaceId={spaceId} currentPage={page} />

      <div className={`flex-1 flex flex-col overflow-hidden ml-14 transition-all duration-300 ${sidebarOffset}`}>
        {/* Space header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{space.name}</span>
            {space.description && (
              <span className="text-xs text-muted-foreground hidden sm:inline">— {space.description}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ytId && (
              <button
                onClick={() => { play("click"); setVideoOpen((v) => !v); }}
                onMouseEnter={() => play("hover")}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <Youtube className="w-3.5 h-3.5" />
                Video
                {videoOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            {!space.materialText && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                No material added
              </span>
            )}
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
          <PageComponent />
        </main>
      </div>

      {!isChat && (
        <ChatSidebar isOpen={chatOpen} onToggle={() => setChatOpen((o) => !o)} />
      )}
    </div>
  );
}
