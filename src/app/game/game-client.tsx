"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "./LoadingOverlay";
import {
  MAX_PLAYERS,
  MIN_IMPOSTORS,
  MIN_PLAYERS,
  clampImpostors,
  clampPlayers,
  configQuery,
  maxImpostorsFor,
  normalizeNames,
  parseConfig,
} from "@/lib/game";

const LINES = [
  "EL FINGIDAZO",
  "ACCESO: AUTORIZADO",
  "INICIALIZANDO...",
  "ES TIEMPO DE ESCOGER EL NÚMERO DE JUGADORES Y FINGIDAZOS PARA INICIAR.",
];

const SPECKS = [
  { left: "4%", top: "8%" },
  { left: "8%", top: "14%" },
  { left: "13%", top: "72%" },
  { left: "19%", top: "29%" },
  { left: "24%", top: "87%" },
  { left: "30%", top: "40%" },
  { left: "35%", top: "16%" },
  { left: "41%", top: "62%" },
  { left: "46%", top: "33%" },
  { left: "52%", top: "22%" },
  { left: "57%", top: "78%" },
  { left: "63%", top: "47%" },
  { left: "68%", top: "11%" },
  { left: "74%", top: "56%" },
  { left: "79%", top: "82%" },
  { left: "84%", top: "27%" },
  { left: "90%", top: "68%" },
  { left: "95%", top: "41%" },
];

export default function GameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Al volver desde "nombres" o "match" se conserva la configuración anterior.
  const [initial] = useState(() => parseConfig(searchParams));
  const [players, setPlayers] = useState(initial.players);
  const [impostors, setImpostors] = useState(initial.impostors);

  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  function updatePlayers(n: number) {
    const p = clampPlayers(n);
    setPlayers(p);
    setImpostors((cur) => clampImpostors(cur, p));
  }

  function updateImpostors(n: number) {
    setImpostors(clampImpostors(n, players));
  }

  // Efecto máquina de escribir: avanza carácter a carácter y luego de línea.
  useEffect(() => {
    if (lineIndex >= LINES.length) return;
    const current = LINES[lineIndex];
    const t =
      charIndex < current.length
        ? setTimeout(() => setCharIndex((c) => c + 1), 36)
        : setTimeout(() => {
            setLineIndex((i) => i + 1);
            setCharIndex(0);
          }, 600);
    return () => clearTimeout(t);
  }, [charIndex, lineIndex]);

  function playClickSound() {
    const a = clickAudioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {
      // El navegador puede bloquear audio antes de la primera interacción.
    });
  }

  function startGame() {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 260);
    setIsLoading(true);
    const names = normalizeNames(initial.names, players);
    setTimeout(() => {
      router.push(`/game/names?${configQuery({ players, impostors, names })}`);
    }, 1200);
  }

  return (
    <main className="w-full h-screen h-dvh flex items-center justify-center overflow-hidden">
      <style>{`
        .console{width:94%;max-width:980px;height:84vh;height:84dvh;border:1px solid var(--g);padding:20px;display:flex;flex-direction:column;gap:14px;background:var(--bg);position:relative;animation:subtleFlicker 5.5s infinite}
        .console .top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--g);padding-bottom:8px}
        .brand{text-transform:uppercase;letter-spacing:2px;font-size:18px;text-shadow:0 0 6px var(--g),0 0 16px var(--gd);padding:6px 0}
        .cmds{display:flex;gap:8px;margin:0 0 5px}
        .controls{display:flex;align-items:center;gap:12px}
        .setting{display:flex;align-items:center;gap:8px}
        .setting-label{font-size:12px;text-transform:uppercase}
        .stepper{display:flex;align-items:center;gap:6px}
        .value{min-width:36px;text-align:center}
        .cmd{padding:6px 10px;text-transform:uppercase;font-size:12px}
        .screen{flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center}
        .row{white-space:pre-wrap;overflow-wrap:anywhere;text-transform:uppercase;font-size:16px;line-height:1.1;text-shadow:0 0 6px var(--g),0 0 12px var(--gd);text-align:center}
        .row.title{font-size:26px;font-weight:700}
        .cursor{display:inline-block;width:10px;height:18px;background:var(--g);margin-left:6px;vertical-align:middle;animation:blink 1s steps(2,start) infinite}
        @keyframes blink{50%{opacity:0}}
        @keyframes subtleFlicker{0%,100%{filter:brightness(1)}50%{filter:brightness(.985)}}
        .speck{position:absolute;width:3px;height:3px;background:var(--g);opacity:.16;animation:speckDrift 7s ease-in-out infinite alternate,speckBlink 1.8s steps(2,start) infinite;will-change:transform,opacity}
        @keyframes speckDrift{0%{transform:translate(0,0)}25%{transform:translate(1px,-2px)}50%{transform:translate(-2px,1px)}75%{transform:translate(2px,2px)}100%{transform:translate(-1px,-1px)}}
        @keyframes speckBlink{0%,100%{opacity:.12}50%{opacity:.4}}
        @media (max-width:640px){.console{padding:12px;height:90vh;height:90dvh}}
        @media (max-width:420px){
          .console{width:90%;padding:10px;gap:10px}
          .console .top{flex-direction:column;align-items:center;gap:10px}
          .brand{font-size:16px}
          .controls{flex-direction:column;align-items:stretch;gap:10px;width:100%}
          .setting{justify-content:space-between;width:100%}
          .value{min-width:44px;font-size:16px}
          .cmd{padding:10px 14px;font-size:15px}
          .cmds .cmd{width:100%}
          .row{font-size:15px}
          .row.title{font-size:20px}
          .cursor{width:8px;height:16px}
        }
        @media (min-width:421px) and (max-width:950px){
          .console{height:70vh;height:70dvh}
          .console .top{flex-wrap:wrap;gap:12px}
          .controls{width:100%;flex-wrap:wrap;justify-content:space-between}
          .setting{min-width:120px}
          .setting-label{font-size:13px}
        }
      `}</style>

      <div className={`console scanlines ${glitch ? "glitch" : ""}`}>
        {isLoading ? <LoadingOverlay /> : null}
        <div className="top">
          <div className="brand">SYSTEM: SECURE_TERMINAL</div>
          <div className="controls">
            <Stepper
              label="Jugadores"
              value={players}
              canDecrease={players > MIN_PLAYERS}
              canIncrease={players < MAX_PLAYERS}
              onChange={updatePlayers}
              onPress={playClickSound}
            />
            <Stepper
              label="Fingidazos"
              value={impostors}
              canDecrease={impostors > MIN_IMPOSTORS}
              canIncrease={impostors < maxImpostorsFor(players)}
              onChange={updateImpostors}
              onPress={playClickSound}
            />
            <div className="cmds">
              <button className="term-btn cmd" onClick={startGame} onPointerDown={playClickSound} disabled={isLoading}>
                RUN
              </button>
            </div>
          </div>
        </div>

        <div className="screen" aria-live="polite">
          {LINES.map((line, i) => {
            const isCurrent = i === lineIndex;
            const shown = i < lineIndex ? line : isCurrent ? line.slice(0, charIndex) : "";
            return (
              <div key={i} className={`row ${i === 0 ? "title" : ""}`} style={{ paddingBottom: i < lineIndex ? 8 : 6 }}>
                <span>{shown}</span>
                {isCurrent && charIndex < line.length ? <span className="cursor" /> : null}
              </div>
            );
          })}
          {lineIndex >= LINES.length ? (
            <div className="row" style={{ marginTop: 10 }}>
              &gt;_ SYSTEM READY -- AWAITING COMMAND<span className="cursor" />
            </div>
          ) : null}
        </div>

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
          {SPECKS.map((speck, i) => (
            <div
              key={i}
              className="speck"
              style={{
                left: speck.left,
                top: speck.top,
                animationDuration: `${6 + (i % 5)}s, ${1.4 + (i % 4) * 0.25}s`,
                animationDelay: `${i * -0.28}s, ${i * -0.15}s`,
              }}
            />
          ))}
        </div>
        <audio ref={clickAudioRef} src="/sounds/key_1.mp3" preload="auto" aria-hidden />
      </div>
    </main>
  );
}

function Stepper({
  label,
  value,
  canDecrease,
  canIncrease,
  onChange,
  onPress,
}: {
  label: string;
  value: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (n: number) => void;
  onPress: () => void;
}) {
  return (
    <div className="setting" role="group" aria-label={label}>
      <div className="setting-label">{label}</div>
      <div className="stepper">
        <button
          className="term-btn cmd"
          onClick={() => onChange(value - 1)}
          onPointerDown={onPress}
          disabled={!canDecrease}
          aria-label={`Disminuir ${label.toLowerCase()}`}
        >
          -
        </button>
        <div className="value" aria-live="polite">
          {value}
        </div>
        <button
          className="term-btn cmd"
          onClick={() => onChange(value + 1)}
          onPointerDown={onPress}
          disabled={!canIncrease}
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
