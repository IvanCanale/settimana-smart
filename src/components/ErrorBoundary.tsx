"use client";
import React from "react";

type ErrorBoundaryState = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReload = () => {
    // Pulisce localStorage corrotto e ricarica
    try {
      localStorage.removeItem("ss_preferences_v1");
      localStorage.removeItem("ss_pantry_v1");
      localStorage.removeItem("ss_seed_v1");
      localStorage.removeItem("ss_manual_overrides_v1");
      localStorage.removeItem("ss_learning_v1");
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: "2rem",
          fontFamily: "'DM Sans', sans-serif", textAlign: "center",
          backgroundColor: "var(--cream, #FAF5ED)", color: "var(--sepia, #3D2B1F)",
        }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ marginBottom: "1.5rem", opacity: 0.7 }}>
            Si è verificato un errore imprevisto. Prova a ricaricare l&apos;app.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.75rem 2rem", borderRadius: "0.5rem",
              backgroundColor: "var(--terra, #C4673A)", color: "white",
              border: "none", cursor: "pointer", fontSize: "1rem",
            }}
          >
            Ricarica
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
