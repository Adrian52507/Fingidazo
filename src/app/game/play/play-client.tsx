"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "../LoadingOverlay";
import { RoundMissing } from "../RoundMissing";
import { type Round, playerLabel, saveRound, useRound } from "@/lib/game";

const REVEAL_THRESHOLD = 60; // px que hay que arrastrar para contar como "visto"
const MAX_LIFT = 160;

export function PlayClient() {
  const searchParams = useSearchParams();
  const round = useRound(searchParams.get("round"));
  if (round === undefined) return <LoadingOverlay />;
  if (round === null) return <RoundMissing />;
  return <RoleDealer round={round} />;
}

function RoleDealer({ round }: { round: Round }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { current, revealed } = round.progress;
  const { players, names } = round.config;
  const isImpostor = round.impostors.includes(current);
  const isLast = current + 1 >= players;

  const otherImpostors = isImpostor
    ? round.impostors.filter((i) => i !== current).map((i) => playerLabel(names, i))
    : [];

  function markRevealed() {
    if (!revealed) saveRound({ ...round, progress: { current, revealed: true } });
  }

  function nextPlayer() {
    if (!revealed) return;
    if (!isLast) {
      saveRound({ ...round, progress: { current: current + 1, revealed: false } });
      return;
    }
    setIsLoading(true);
    router.push(`/game/match?round=${round.id}`);
  }

  return (
    <main className="w-full h-screen h-dvh flex items-center justify-center">
      <style>{`
        @keyframes card-glitch{
          0%{transform:translate(0,0);clip-path:inset(0 0 0 0)}
          10%{transform:translate(-3px,2px);clip-path:inset(5% 0 0 0)}
          20%{transform:translate(2px,-2px);clip-path:inset(0 0 8% 0)}
          30%{transform:translate(-2px,1px);clip-path:inset(2% 0 2% 0)}
          40%{transform:translate(3px,-1px);clip-path:inset(0 0 3% 0)}
          50%{transform:translate(-1px,0);clip-path:inset(0 0 0 0)}
          60%{transform:translate(2px,2px);clip-path:inset(7% 0 0 0)}
          70%{transform:translate(-3px,-1px);clip-path:inset(0 0 6% 0)}
          80%{transform:translate(1px,1px);clip-path:inset(1% 0 1% 0)}
          90%{transform:translate(-2px,0);clip-path:inset(0 0 4% 0)}
          100%{transform:translate(0,0);clip-path:inset(0 0 0 0)}
        }
        .deal-wrap{padding:18px;border:1px solid var(--g);max-width:760px;width:94%;position:relative;overflow:hidden;height:min(78vh,720px);height:min(78dvh,720px)}
        .card-stage{position:absolute;inset:0;padding:18px;display:flex;align-items:center;justify-content:center}
        .back-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:28px;background:var(--g);color:#000;box-shadow:0 6px 18px rgb(0 0 0 / 35%);z-index:1;text-align:center}
        .front-card{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--bg);cursor:grab;z-index:2;touch-action:none;user-select:none;-webkit-user-select:none;animation:card-glitch .4s steps(10,end)}
        .front-card:active{cursor:grabbing}
        .front-card:focus-visible{outline-offset:-4px}
        .card-inner{display:flex;flex-direction:column;width:100%;height:100%;padding:18px;justify-content:space-between}
        .card-header{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .card-title{font-size:18px;font-weight:700}
        .card-category{font-size:13px}
        .card-hint{font-size:20px;text-align:center}
        .card-hint small{display:block;margin-top:8px;font-size:12px;opacity:.6}
        @media (hover:none){.card-hint small{display:none}}
        .card-footer{display:flex;flex-direction:column;align-items:center;gap:8px}
        .card-player{font-size:15px;opacity:.9}
        .card-step{font-size:12px;opacity:.6}
        .role-title{font-size:20px;font-weight:700}
        .role-line{margin-top:10px;font-size:16px;padding:0 12px}
        @media (max-width:420px){
          .card-stage{padding:12px}
          .card-header{flex-direction:column;justify-content:center;gap:6px}
          .card-category{font-size:12px}
          .role-title{font-size:18px}
          .role-line{font-size:14px}
        }
      `}</style>

      <div className="deal-wrap">
        <div className="card-stage">
          <RoleCard
            // La key reinicia el estado de arrastre al pasar al siguiente jugador.
            key={current}
            revealed={revealed}
            onReveal={markRevealed}
            back={
              isImpostor ? (
                <div>
                  <div className="role-title">FINGIDAZO 😈</div>
                  {otherImpostors.length > 0 ? (
                    <div className="role-line">
                      {otherImpostors.length === 1 ? "Tu cómplice" : "Tus cómplices"}:{" "}
                      <strong>{otherImpostors.join(", ")}</strong>
                    </div>
                  ) : (
                    <div className="role-line">Finge que conoces la palabra.</div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="role-title">JUGADOR</div>
                  <div className="role-line">
                    Palabra: <strong>{round.secret}</strong>
                  </div>
                </div>
              )
            }
            front={
              <div className="card-inner">
                <div className="card-header">
                  <div className="card-title">Reparto de roles</div>
                  <div className="card-category">
                    Categoría: <strong>{round.category}</strong>
                  </div>
                </div>
                <div className="card-hint">
                  Arrastra hacia arriba para ver
                  <small>o mantén presionada la barra espaciadora</small>
                </div>
                <div className="card-footer">
                  <div className="card-player">{playerLabel(names, current)}</div>
                  <div className="card-step">
                    {current + 1} / {players}
                  </div>
                  <button className="term-btn" onClick={nextPlayer} disabled={!revealed}>
                    {isLast ? "Iniciar juego" : "Siguiente jugador"}
                  </button>
                </div>
              </div>
            }
          />
        </div>
      </div>
      {isLoading ? <LoadingOverlay /> : null}
    </main>
  );
}

function RoleCard({
  revealed,
  onReveal,
  front,
  back,
}: {
  revealed: boolean;
  onReveal: () => void;
  front: React.ReactNode;
  back: React.ReactNode;
}) {
  const dragStartRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const isDragging = dragging || dragY > 0;

  function start(clientY: number) {
    dragStartRef.current = clientY;
    setDragging(true);
  }

  function move(clientY: number) {
    if (dragStartRef.current === null) return;
    setDragY(Math.max(0, dragStartRef.current - clientY));
  }

  function end(commit: boolean) {
    if (commit && dragY > REVEAL_THRESHOLD) onReveal();
    dragStartRef.current = null;
    setDragging(false);
    setDragY(0);
  }

  // Mientras se arrastra, el reverso aparece en proporción; una vez visto, queda listo debajo.
  const revealRatio = Math.min(Math.max(revealed ? 1 : dragY / 120, 0), 1);

  return (
    <>
      <div
        className="back-card"
        aria-hidden={dragY === 0}
        style={{
          opacity: revealRatio,
          transform: `translateY(${12 * (1 - revealRatio)}px)`,
          transition: isDragging ? "none" : "opacity 160ms ease, transform 160ms ease",
        }}
      >
        {back}
      </div>

      <div
        className="front-card"
        role="button"
        tabIndex={0}
        aria-label="Tarjeta de rol: arrastra hacia arriba o mantén la barra espaciadora para ver tu rol"
        onPointerDown={(e) => {
          // Los botones dentro de la tarjeta funcionan normal, sin iniciar arrastre.
          if ((e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start(e.clientY);
        }}
        onPointerMove={(e) => move(e.clientY)}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || (e.key !== " " && e.key !== "Enter")) return;
          e.preventDefault();
          if (!e.repeat) setDragY(MAX_LIFT);
        }}
        onKeyUp={(e) => {
          if (e.target !== e.currentTarget || (e.key !== " " && e.key !== "Enter")) return;
          end(true);
        }}
        onBlur={() => end(false)}
        style={{
          transform: dragY > 0 ? `translateY(-${Math.min(dragY, MAX_LIFT)}px)` : undefined,
          transition: isDragging ? "none" : "transform 220ms ease",
        }}
      >
        {front}
      </div>
    </>
  );
}
