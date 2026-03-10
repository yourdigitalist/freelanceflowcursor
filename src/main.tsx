import { createRoot } from "react-dom/client";
import { Component, type ErrorInfo, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

/** Catches any error (including in providers) so we never show a white screen without a message */
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null; errorInfo: ErrorInfo | null }
> {
  state = { error: null as Error | null, errorInfo: null as ErrorInfo | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Root error:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 600 }}>
          <h1 style={{ color: "#b91c1c", marginBottom: 8 }}>App failed to load</h1>
          <p style={{ color: "#666", marginBottom: 12 }}>{this.state.error.message}</p>
          {this.state.error.stack && (
            <pre style={{ background: "#fef2f2", padding: 12, overflow: "auto", fontSize: 12 }}>
              {this.state.error.stack}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
