import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import QuizPage from "@/pages/QuizPage";
import FlashcardsPage from "@/pages/FlashcardsPage";
import SummaryPage from "@/pages/SummaryPage";
import ProgressPage from "@/pages/ProgressPage";
import PomodoroPage from "@/pages/PomodoroPage";
import StudyPlanPage from "@/pages/StudyPlanPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/quiz" component={QuizPage} />
      <Route path="/flashcards" component={FlashcardsPage} />
      <Route path="/summary" component={SummaryPage} />
      <Route path="/progress" component={ProgressPage} />
      <Route path="/pomodoro" component={PomodoroPage} />
      <Route path="/study-plan" component={StudyPlanPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="flex min-h-screen bg-background">
            <Navigation />
            <main className="flex-1 ml-16 min-h-screen overflow-y-auto">
              <Router />
            </main>
          </div>
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
