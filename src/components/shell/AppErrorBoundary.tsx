import { Component, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  private reloadApplication = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div className="max-w-md">
          <h1 className="text-2xl font-extrabold tracking-tight">
            應用程式發生問題
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app could not continue. Reload to try again
          </p>
          <button
            type="button"
            onClick={this.reloadApplication}
            className="mt-6 h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            重新載入
          </button>
        </div>
      </main>
    );
  }
}
