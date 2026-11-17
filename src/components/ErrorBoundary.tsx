import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Samajh UI Error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="samajh-shell">
          <main className="main-section">
            <section className="glass-card auth-card" role="alert">
              <h1 className="section-heading">Something went wrong</h1>
              <p className="body-text">
                We could not finish that request safely. Please reload the page to continue.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                Reload Samajh
              </button>
            </section>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
