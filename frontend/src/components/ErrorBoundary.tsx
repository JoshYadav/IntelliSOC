import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. If omitted, a styled default is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React class-based error boundary.
 *
 * Catches any unhandled JS error thrown in the subtree during render,
 * in a lifecycle method, or in a constructor, and renders a fallback UI
 * instead of leaving a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console (swap for a real error reporting service in prod, e.g. Sentry)
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            gap: '1.25rem',
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius)',
            margin: '2rem 0',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-critical)',
            }}
          >
            <AlertTriangle size={28} />
          </span>

          <div>
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                maxWidth: '480px',
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred while rendering this section.
              {this.state.error?.message && (
                <>
                  {' '}
                  <code
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: 'var(--color-accent-rose)',
                      background: 'rgba(244, 63, 94, 0.08)',
                      padding: '0.1em 0.35em',
                      borderRadius: '4px',
                    }}
                  >
                    {this.state.error.message}
                  </code>
                </>
              )}
            </p>
          </div>

          <button
            id="error-boundary-retry-btn"
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-critical)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
