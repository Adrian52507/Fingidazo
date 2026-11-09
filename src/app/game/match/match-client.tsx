"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "../LoadingOverlay";
import { RoundMissing } from "../RoundMissing";
import { type Round, configQuery, createRound, pickStarter, playerLabel, saveRound, useRound } from "@/lib/game";

export function MatchClient() {
  const searchParams = useSearchParams();
  const round = useRound(searchParams.get("round"));
  if (round === undefined) return <LoadingOverlay />;
  if (round === null) return <RoundMissing />;
  return <MatchBoard round={round} />;
}

function MatchBoard({ round }: { round: Round }) {
  const router = useRouter();
  const { players, impostors, names } = round.config;
  const labels = Array.from({ length: players }, (_, i) => playerLabel(names, i));

  const [showSecret, setShowSecret] = useState(false);
  const [revealedPlayers, setRevealedPlayers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [rouletteIndex, setRouletteIndex] = useState(0);

  const starter = round.starter;
  const isPickingStarter = !starter;

  // Ruleta visual; el resultado se guarda en la ronda para que recargar no lo cambie.
  useEffect(() => {
    if (round.starter) return;
    let tick = 0;
    const totalTicks = Math.max(18, players * 8);
    const timer = window.setInterval(() => {
      tick += 1;
      setRouletteIndex(tick % players);
      if (tick >= totalTicks) {
        window.clearInterval(timer);
        saveRound({ ...round, starter: pickStarter(players) });
      }
    }, 85);
    return () => window.clearInterval(timer);
  }, [round, players]);

  function goTo(path: string) {
    if (isLoading) return;
    setIsLoading(true);
    router.push(path);
  }

  return (
    <main className="w-full min-h-screen min-h-dvh flex items-center justify-center py-6 px-3">
      <style>{`
        .match-wrap{padding:18px;border:1px solid var(--g);max-width:980px;width:100%;position:relative;overflow:hidden;text-align:center}
        .headline{font-size:20px;font-weight:700}
        .meta{margin-top:10px;font-size:14px}
        .panel{margin-top:14px;padding:14px;border:1px solid var(--g-line);border-radius:10px}
        .section-title{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
        .reveal-area{margin-top:10px;min-height:42px;display:flex;align-items:center;justify-content:center}
        .secret{margin-top:8px;font-size:18px;font-weight:700}
        .starter-overlay{position:absolute;inset:0;background:rgb(0 0 0 / 94%);display:flex;align-items:center;justify-content:center;padding:18px;z-index:40}
        .starter-panel{width:min(560px,100%);border:1px solid rgb(0 255 65 / 65%);border-radius:10px;padding:16px;box-shadow:0 0 20px rgb(0 255 65 / 14%)}
        .starter-title{font-size:13px;letter-spacing:.8px;text-transform:uppercase;opacity:.9}
        .starter-roulette{margin-top:12px;border:1px solid rgb(0 255 65 / 45%);border-radius:8px;min-height:74px;display:flex;align-items:center;justify-content:center;padding:8px 10px;background:rgb(0 255 65 / 4%)}
        .starter-name{font-size:24px;font-weight:700;letter-spacing:.4px;text-shadow:0 0 10px rgb(0 255 65 / 35%)}
        .starter-name.rolling{animation:pickBlink .26s linear infinite}
        .starter-help{margin-top:10px;font-size:12px;opacity:.82;min-height:18px}
        .starter-final{margin-top:12px;font-size:15px}
        .pulse{animation:pulse 1.2s ease-in-out infinite}
        .players-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:10px}
        .player-card{border:1px solid rgb(0 255 65 / 45%);border-radius:8px;padding:10px;min-height:120px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;gap:8px}
        .player-card.is-impostor{border-color:var(--danger);box-shadow:0 0 12px rgb(255 77 77 / 25%)}
        .player-name{font-size:14px;font-weight:700;min-height:36px;display:flex;align-items:center;justify-content:center;overflow-wrap:anywhere}
        .player-result{font-size:14px;min-height:34px;display:flex;align-items:center}
        .player-result.is-impostor{color:var(--danger)}
        .actions{margin-top:18px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        @media (max-width:640px){
          .match-wrap{padding:14px}
          .headline{font-size:18px}
          .meta{font-size:13px}
          .panel{padding:12px}
          .players-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .player-card{min-height:96px;padding:8px 6px}
          .player-name{font-size:12px;min-height:28px}
          .player-result{font-size:12px;min-height:24px}
          .match-wrap .term-btn{padding:6px 8px;font-size:12px}
          .starter-panel{padding:12px}
          .starter-name{font-size:19px}
        }
        @keyframes pickBlink{0%,100%{opacity:.55}50%{opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 6px rgb(0 255 65 / 6%)}50%{transform:scale(1.015);box-shadow:0 0 18px rgb(0 255 65 / 18%)}}
      `}</style>

      <div className="match-wrap">
        {isLoading ? <LoadingOverlay /> : null}

        {overlayOpen ? (
          <div className="starter-overlay" role="dialog" aria-modal="true" aria-labelledby="starter-title">
            <div className="starter-panel">
              <div id="starter-title" className="starter-title">
                {isPickingStarter ? "Seleccionando jugador inicial..." : "Jugador inicial seleccionado"}
              </div>
              <div className="starter-roulette" aria-live="polite">
                <div className={`starter-name ${isPickingStarter ? "rolling" : ""}`}>
                  {starter ? labels[starter.index] : labels[rouletteIndex]}
                </div>
              </div>
              {starter ? (
                <>
                  <div className="starter-final">
                    Empieza la partida: <strong>{labels[starter.index]}</strong>
                  </div>
                  <div className="starter-final">
                    Pasa el teléfono hacia la <strong>{starter.direction}</strong>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button className="term-btn pulse" autoFocus onClick={() => setOverlayOpen(false)}>
                      Entrar a la partida
                    </button>
                  </div>
                </>
              ) : (
                <div className="starter-help">La ruleta está decidiendo quién empieza</div>
              )}
            </div>
          </div>
        ) : null}

        <h1 className="headline">*** GAME READY ***</h1>
        <div className="meta">
          Categoría: <strong>{round.category}</strong>
        </div>
        <div className="meta">
          Jugadores: <strong>{players}</strong> — Fingidazos: <strong>{impostors}</strong>
        </div>

        <section className="panel" aria-labelledby="secret-title">
          <div id="secret-title" className="section-title">
            Palabra secreta
          </div>
          <div className="reveal-area" aria-live="polite">
            {showSecret ? (
              <div className="secret">{round.secret}</div>
            ) : (
              <button className="term-btn pulse" onClick={() => setShowSecret(true)}>
                Tocar para revelar
              </button>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="roles-title">
          <div id="roles-title" className="section-title">
            Fingidazo(s)
          </div>
          <div className="players-grid">
            {labels.map((label, idx) => {
              const isRevealed = revealedPlayers.includes(idx);
              const isFingidazo = round.impostors.includes(idx);
              const tone = isRevealed && isFingidazo ? "is-impostor" : "";
              return (
                <div key={idx} className={`player-card ${tone}`}>
                  <div className="player-name">{label}</div>
                  <div aria-live="polite">
                    {isRevealed ? (
                      <div className={`player-result ${tone}`}>
                        {isFingidazo ? <strong>Fingidazo 😈</strong> : <span>Jugador normal</span>}
                      </div>
                    ) : (
                      <button
                        className="term-btn pulse"
                        onClick={() => setRevealedPlayers((prev) => [...prev, idx])}
                        aria-label={`Revelar rol de ${label}`}
                      >
                        Revelar rol
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="actions">
          <button
            className="term-btn"
            onClick={() => goTo(`/game/play?round=${createRound(round.config, round.category).id}`)}
            disabled={isLoading}
          >
            Otra ronda
          </button>
          <button
            className="term-btn"
            onClick={() => goTo(`/game/categories?${configQuery(round.config)}`)}
            disabled={isLoading}
          >
            Escoger otra categoría
          </button>
          <button className="term-btn" onClick={() => goTo(`/game?${configQuery(round.config)}`)} disabled={isLoading}>
            Volver al menú
          </button>
        </div>
      </div>
    </main>
  );
}
