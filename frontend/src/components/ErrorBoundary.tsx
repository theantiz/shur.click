import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // You can log to Sentry/LogRocket etc. here later
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-red-400 px-4">
          <h1 className="text-3xl font-mono mb-4">Something went wrong.</h1>

          <pre className="max-w-2xl w-full overflow-auto bg-red-900/20 p-4 rounded text-sm">
            {this.state.error?.message || "Unknown error"}
          </pre>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 font-mono text-sm text-red-200 hover:bg-red-500/20 transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
