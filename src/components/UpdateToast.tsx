"use client";
import { useEffect, useState } from "react";

export function UpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => setShow(true);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, backgroundColor: "var(--sepia, #3D2B1F)", color: "white",
      padding: "1rem 1.5rem", borderRadius: "0.75rem",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: "90vw",
      display: "flex", alignItems: "center", gap: "0.75rem",
    }}>
      <span>Nuova versione disponibile</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: "var(--terra, #C4673A)", border: "none", color: "white",
          cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
          padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
        }}
      >
        Ricarica
      </button>
      <button
        onClick={() => setShow(false)}
        style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem" }}
      >
        ×
      </button>
    </div>
  );
}
