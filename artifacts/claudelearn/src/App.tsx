import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SpaceProvider } from "@/context/SpaceContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TokenProvider } from "@/context/TokenContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SpacesPage from "@/pages/SpacesPage";
import StudyLayout from "@/components/StudyLayout";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={SpacesPage} />
      <Route path="/space/:id/:page" component={StudyLayout} />
      <Route path="/space/:id">
        {(params) => <Redirect to={`/space/${params.id}/chat`} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TokenProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <SpaceProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                  <Toaster />
                </WouterRouter>
              </SpaceProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </TokenProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
