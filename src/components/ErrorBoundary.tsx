import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Shows a friendly screen instead of a blank page if something crashes. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to your error tracker here (e.g. Sentry) if you add one.
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page px-4 text-center">
        <h1 className="text-2xl font-extrabold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-ink-3">Please reload the page. If it keeps happening, contact support.</p>
        <button type="button" className="btn-primary mt-2" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
