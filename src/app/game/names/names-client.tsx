"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "../LoadingOverlay";
import { MAX_NAME_LENGTH, configQuery, parseConfig, validateNames } from "@/lib/game";

export default function NamesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config] = useState(() => parseConfig(searchParams, { players: 3, impostors: 1 }));

  const [names, setNames] = useState<string[]>(config.names);
  const [error, setError] = useState<{ message: string; invalid: number[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function playClickSound() {
    const a = clickAudioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value.slice(0, MAX_NAME_LENGTH) : n)));
    if (error) setError(null);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const next = inputRefs.current[index + 1];
    if (next) {
      event.preventDefault();
      next.focus();
    }
    // En el último campo, Enter envía el formulario.
  }

  function goBack() {
    router.push(`/game?${configQuery({ ...config, names })}`);
  }

  function continueToCategories(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = names.map((n) => n.trim());
    const problem = validateNames(trimmed);
    if (problem) {
      setError(problem);
      inputRefs.current[problem.invalid[0]]?.focus();
      return;
    }

    setGlitch(true);
    setTimeout(() => setGlitch(false), 260);
    setIsLoading(true);
    setTimeout(() => {
      router.push(`/game/categories?${configQuery({ ...config, names: trimmed })}`);
    }, 1200);
  }

  return (
    <main className="w-full h-screen h-dvh flex items-center justify-center overflow-hidden">
      <style>{`
        .names-console{width:94%;max-width:900px;height:84vh;height:84dvh;border:1px solid var(--g);padding:20px;display:flex;flex-direction:column;gap:14px;background:var(--bg);position:relative;animation:subtleFlicker 5.5s infinite}
        .names-console .top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--g);padding-bottom:8px}
        .names-brand{text-transform:uppercase;letter-spacing:2px;font-size:18px;text-shadow:0 0 6px var(--g),0 0 16px var(--gd);padding:6px 0}
        .names-meta{font-size:13px;opacity:.8}
        .names-screen{flex:1;padding:12px 0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;scrollbar-width:none}
        .names-screen::-webkit-scrollbar{display:none}
        .names-title{text-transform:uppercase;text-align:center;margin-bottom:12px;opacity:.9;text-shadow:0 0 6px var(--g),0 0 12px var(--gd)}
        .name-row{display:flex;align-items:center;gap:12px;padding:8px;border:1px solid var(--g-line);border-radius:4px;transition:border-color 120ms ease, box-shadow 120ms ease}
        .name-row:focus-within{border-color:var(--g);box-shadow:0 0 8px rgb(0 255 65 / 25%)}
        .name-row.invalid{border-color:var(--danger)}
        .name-label{min-width:120px;font-size:13px;opacity:.8}
        .name-input{flex:1;min-width:0;background:transparent;border:none;color:var(--g);font:inherit;font-size:16px;padding:4px 6px;outline:none}
        .name-input::placeholder{color:rgb(0 255 65 / 40%)}
        .controls-names{display:flex;gap:8px;justify-content:center}
        .names-console .cmd{padding:8px 14px;text-transform:uppercase;font-size:12px}
        @keyframes subtleFlicker{0%,100%{filter:brightness(1)}50%{filter:brightness(.985)}}
        @media (max-width:640px){.names-console{padding:12px;height:90vh;height:90dvh}.names-brand{font-size:14px}.meta-sep{display:none}.names-meta{display:flex;flex-direction:column;align-items:flex-end;gap:2px}}
        @media (max-width:420px){
          .names-console{width:90%;padding:10px;gap:10px}
          .names-meta{font-size:12px}
          .name-row{gap:8px;padding:6px}
          .name-label{min-width:80px;font-size:12px}
          .names-console .cmd{padding:10px 14px;font-size:12px}
        }
      `}</style>

      <form
        onSubmit={continueToCategories}
        noValidate
        className={`names-console scanlines ${glitch ? "glitch" : ""}`}
      >
        {isLoading ? <LoadingOverlay /> : null}

        <div className="top">
          <div className="names-brand">SYSTEM: PLAYER_REGISTRY</div>
          <div className="names-meta">
            <strong>Jugadores</strong> {config.players}
            <span className="meta-sep"> | </span>
            <strong>Fingidazos</strong> {config.impostors}
          </div>
        </div>

        <div className="names-screen">
          <div className="names-title">Ingresa los nombres:</div>

          {names.map((name, idx) => {
            const invalid = error?.invalid.includes(idx) ?? false;
            const inputId = `player-name-${idx}`;
            return (
              <div key={idx} className={`name-row ${invalid ? "invalid" : ""}`}>
                <label className="name-label" htmlFor={inputId}>
                  Jugador {idx + 1}:
                </label>
                <input
                  id={inputId}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  className="name-input"
                  placeholder={`Nombre ${idx + 1}`}
                  value={name}
                  onChange={(e) => updateName(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPointerDown={playClickSound}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint={idx === names.length - 1 ? "done" : "next"}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? "names-error" : undefined}
                />
              </div>
            );
          })}
        </div>

        {error ? (
          <div id="names-error" className="term-error" role="alert">
            {error.message}
          </div>
        ) : null}

        <div className="controls-names">
          <button type="button" className="term-btn cmd" onClick={goBack} onPointerDown={playClickSound}>
            Volver
          </button>
          <button type="submit" className="term-btn cmd" onPointerDown={playClickSound} disabled={isLoading}>
            Continuar
          </button>
        </div>

        <audio ref={clickAudioRef} src="/sounds/key_1.mp3" preload="auto" aria-hidden />
      </form>
    </main>
  );
}
