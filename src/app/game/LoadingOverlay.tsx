export function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
        zIndex: 9999,
        background: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7))",
      }}
    >
      <style>{`
        .loading-dots{display:inline-flex;gap:6px}
        .loading-dots span{display:inline-block;width:8px;height:8px;background:var(--g);border-radius:50%;opacity:.3;animation:loading-jump 1.05s infinite}
        .loading-dots span:nth-child(2){animation-delay:.12s}
        .loading-dots span:nth-child(3){animation-delay:.24s}
        @keyframes loading-jump{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-10px)}}
      `}</style>
      <div className="loading-dots" aria-hidden>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}
