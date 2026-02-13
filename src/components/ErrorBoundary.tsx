import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      const isDev = import.meta.env.DEV;
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground text-sm">
                An unexpected error occurred. Try refreshing the page.
              </p>
              {isDev && (
                <div className="text-left rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs font-mono break-all">
                  <p className="font-semibold text-destructive mb-1">{err.name}: {err.message}</p>
                  {err.stack && (
                    <pre className="whitespace-pre-wrap text-muted-foreground mt-2 max-h-40 overflow-auto">
                      {err.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>
                  Refresh page
                </Button>
                <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
