import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); }}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:brightness-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
