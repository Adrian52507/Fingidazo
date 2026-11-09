"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "../LoadingOverlay";
import { CATEGORIES, configQuery, createRound, parseConfig } from "@/lib/game";

export default function CategoriesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config] = useState(() => parseConfig(searchParams, { players: 3, impostors: 1 }));
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);

  function playHoverSound() {
    const a = hoverAudioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function play() {
    if (!selectedCat || isLoading) return;
    setIsLoading(true);
    // La palabra y los roles se sortean aquí y se guardan en sessionStorage:
    // la URL solo lleva un id opaco, así nadie puede leer la respuesta en la barra.
    const round = createRound(config, selectedCat);
    router.push(`/game/play?round=${round.id}`);
  }

  return (
    <main className="w-full min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 py-4">
      <style>{`
        .cat-wrap{padding:14px 20px 14px 25px;border:1px solid var(--g);max-width:760px;width:94%}
        .cat-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px}
        .cat-title{font-size:20px;font-weight:700}
        .cat-meta{font-size:13px;text-align:right}
        .back-btn{background:transparent;border:1px solid transparent;color:var(--g);padding:6px 8px;border-radius:6px;cursor:pointer;font-size:16px}
        .back-btn:hover{border-color:var(--g-line)}
        .back-btn:active{transform:translateY(1px)}
        .cat-list{display:flex;flex-direction:column;gap:12px;max-height:288px;overflow-y:auto;padding:8px 6px 4px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .cat-list::-webkit-scrollbar{display:none}
        .cat-btn{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;border:1px solid var(--g);background:transparent;color:var(--g);text-align:left;width:100%;cursor:pointer;transition:transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;font:inherit}
        .cat-btn:hover{background:rgb(0 255 65 / 3%);transform:translateY(-3px);box-shadow:0 10px 24px rgb(0 255 65 / 4%)}
        .cat-btn:active{transform:translateY(0);box-shadow:none;background:var(--g-soft)}
        .cat-btn[aria-pressed="true"]{background:rgb(0 255 65 / 12%);box-shadow:0 0 0 1px var(--g) inset, 0 0 14px rgb(0 255 65 / 18%)}
        .cat-icon{width:56px;height:40px;border-radius:6px;background:var(--g-soft);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .cat-name{font-size:16px;font-weight:700;text-transform:uppercase}
        .cat-sub{font-size:12px;opacity:.8}
        .cat-check{font-size:14px;opacity:.9;min-width:1ch}
        .play-row{display:flex;justify-content:center;padding:12px;width:100%}
        .play-btn{padding:10px 16px;text-transform:uppercase}
        @media (max-width:950px){
          .cat-header{flex-wrap:wrap}
          .cat-meta{width:100%;text-align:left}
        }
        @media (min-width:421px) and (max-width:950px){
          .cat-wrap{max-width:640px;width:86%}
          .cat-list{max-height:400px}
        }
        @media (max-width:420px){
          .cat-wrap{padding:12px 12px 12px 17px;width:88%;max-width:360px}
          .cat-title{font-size:18px}
          .cat-icon{width:48px;height:36px;font-size:16px}
          .cat-name{font-size:14px}
          .back-btn{padding:8px 10px}
          .cat-list{max-height:min(420px, 55dvh)}
        }
      `}</style>

      {isLoading ? <LoadingOverlay /> : null}

      <div className="cat-wrap">
        <div className="cat-header">
          <button
            className="back-btn"
            aria-label="Volver a los nombres"
            onClick={() => router.push(`/game/names?${configQuery(config)}`)}
          >
            ←
          </button>
          <h1 className="cat-title">CATEGORÍAS</h1>
          <div className="cat-meta">
            <div>
              Jugadores: <strong>{config.players}</strong>
            </div>
            <div>
              Fingidazos: <strong>{config.impostors}</strong>
            </div>
          </div>
        </div>

        <p style={{ opacity: 0.9, marginBottom: 12 }}>Selecciona una categoría para la partida:</p>

        <div className="cat-list" role="group" aria-label="Categorías">
          {CATEGORIES.map((cat) => {
            const selected = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                className="cat-btn"
                aria-pressed={selected}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") playHoverSound();
                }}
                onPointerDown={(e) => {
                  if (e.pointerType !== "mouse") playHoverSound();
                }}
                onClick={() => setSelectedCat((cur) => (cur === cat.id ? null : cat.id))}
              >
                <span className="cat-icon" aria-hidden>
                  {cat.icon}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="cat-name" style={{ display: "block" }}>
                    {cat.id}
                  </span>
                  <span className="cat-sub" style={{ display: "block" }}>
                    {cat.description}
                  </span>
                </span>
                <span className="cat-check" aria-hidden>
                  {selected ? "✓" : "→"}
                </span>
              </button>
            );
          })}
        </div>
        <audio ref={hoverAudioRef} src="/sounds/mouse_up.mp3" preload="auto" aria-hidden />
      </div>

      <div className="play-row">
        <button className="term-btn play-btn" disabled={!selectedCat || isLoading} onClick={play}>
          JUGAR
        </button>
      </div>
    </main>
  );
}
