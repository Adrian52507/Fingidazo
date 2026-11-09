import { useSyncExternalStore } from "react";
import { wordBank } from "./wordBank";

/* ------------------------------------------------------------------ */
/* Configuración de partida                                            */
/* ------------------------------------------------------------------ */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const MIN_IMPOSTORS = 1;
export const MAX_NAME_LENGTH = 20;
export const DEFAULT_PLAYERS = 10;
export const DEFAULT_IMPOSTORS = 2;

export type GameConfig = {
  players: number;
  impostors: number;
  /** Siempre tiene exactamente `players` elementos (vacíos si no hay nombre). */
  names: string[];
};

type SearchParamsLike = { get(name: string): string | null } | null | undefined;

export function maxImpostorsFor(players: number) {
  return Math.max(MIN_IMPOSTORS, Math.floor(players / 2));
}

export function clampPlayers(n: number) {
  if (!Number.isFinite(n)) return DEFAULT_PLAYERS;
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.round(n)));
}

export function clampImpostors(n: number, players: number) {
  if (!Number.isFinite(n)) return MIN_IMPOSTORS;
  return Math.max(MIN_IMPOSTORS, Math.min(maxImpostorsFor(players), Math.round(n)));
}

function parseNames(raw: string | null): string[] {
  if (!raw) return [];
  // `URLSearchParams.get` ya devuelve el valor decodificado. El segundo intento
  // solo existe para enlaces antiguos que codificaban el JSON dos veces.
  for (const candidate of [raw, safeDecode(raw)]) {
    if (candidate === null) continue;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed.map((v) => (typeof v === "string" ? v : String(v ?? "")));
    } catch {
      // probar el siguiente formato
    }
  }
  return [];
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function normalizeNames(names: string[], players: number) {
  return Array.from({ length: players }, (_, i) => (names[i] ?? "").slice(0, MAX_NAME_LENGTH));
}

export function parseConfig(
  sp: SearchParamsLike,
  defaults: { players: number; impostors: number } = { players: DEFAULT_PLAYERS, impostors: DEFAULT_IMPOSTORS }
): GameConfig {
  const players = clampPlayers(Number.parseInt(sp?.get("players") ?? "", 10) || defaults.players);
  const impostors = clampImpostors(Number.parseInt(sp?.get("impostors") ?? "", 10) || defaults.impostors, players);
  const names = normalizeNames(parseNames(sp?.get("names") ?? null), players);
  return { players, impostors, names };
}

/** Construye la query de una configuración. Codifica una sola vez. */
export function configQuery(config: GameConfig, { includeNames = true } = {}) {
  const params = new URLSearchParams({
    players: String(config.players),
    impostors: String(config.impostors),
  });
  if (includeNames && config.names.some((n) => n.trim())) {
    params.set("names", JSON.stringify(config.names));
  }
  return params.toString();
}

export function playerLabel(names: string[], index: number) {
  return names[index]?.trim() || `Jugador ${index + 1}`;
}

/** Devuelve un mensaje de error o null si los nombres son válidos. */
export function validateNames(names: string[]): { message: string; invalid: number[] } | null {
  const empty = names.flatMap((n, i) => (n.trim() ? [] : [i]));
  if (empty.length) {
    return { message: "Falta el nombre de algunos jugadores.", invalid: empty };
  }
  const seen = new Map<string, number>();
  const repeated: number[] = [];
  names.forEach((n, i) => {
    const key = n.trim().toLocaleLowerCase("es");
    const first = seen.get(key);
    if (first === undefined) seen.set(key, i);
    else repeated.push(first, i);
  });
  if (repeated.length) {
    return { message: "Hay nombres repetidos: cada jugador necesita uno distinto.", invalid: [...new Set(repeated)] };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

export type Category = { id: string; icon: string; description: string };

export const CATEGORIES: Category[] = [
  { id: "Películas", icon: "🎬", description: "Los títulos y escenas más famosas de películas de todos los tiempos." },
  { id: "Series", icon: "📺", description: "Series populares de TV, tramas y temporadas que todos recuerdan." },
  { id: "Personajes", icon: "🧑", description: "Personajes icónicos de películas o series, protagonistas y secundarios." },
  { id: "Celebridades", icon: "🌟", description: "Famosos, celebridades y figuras públicas reconocidas mundialmente." },
  { id: "Animales", icon: "🐾", description: "Especies, mascotas y criaturas del reino animal, domésticas y salvajes." },
  { id: "Comida", icon: "🍔", description: "Platos, recetas, ingredientes y sabores de distintas cocinas alrededor del mundo." },
  { id: "Disney", icon: "🏰", description: "Personajes, películas y momentos mágicos del mundo de Disney." },
  { id: "Perú", icon: "🦙", description: "Cosas, lugares y elementos icónicos de la cultura peruana." },
].filter((c) => (wordBank[c.id]?.length ?? 0) > 0);

/* ------------------------------------------------------------------ */
/* Almacenamiento seguro (modo privado / cuotas llenas no rompen nada) */
/* ------------------------------------------------------------------ */

function storage(kind: "local" | "session"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readJson<T>(store: Storage | null, key: string): T | null {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(store: Storage | null, key: string, value: unknown) {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento el juego sigue funcionando, solo sin memoria.
  }
}

function randomIndex(length: number) {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % length;
  }
  return Math.floor(Math.random() * length);
}

/* ------------------------------------------------------------------ */
/* Palabra secreta sin repeticiones recientes                          */
/* ------------------------------------------------------------------ */

const RECENT_WORDS_KEY = "fingidazo:recent-words:v1";

function pickSecretWord(category: string): string {
  const list = (wordBank[category] ?? []).map((w) => w.trim()).filter(Boolean);
  if (!list.length) throw new Error(`Categoría sin palabras: ${category}`);

  const store = storage("local");
  const recentByCat = readJson<Record<string, string[]>>(store, RECENT_WORDS_KEY) ?? {};
  const memory = Math.min(30, Math.floor(list.length / 2));
  const recent = new Set((recentByCat[category] ?? []).slice(-memory));
  const pool = list.filter((w) => !recent.has(w));
  const word = (pool.length ? pool : list)[randomIndex(pool.length ? pool.length : list.length)];

  recentByCat[category] = [...(recentByCat[category] ?? []).filter((w) => w !== word), word].slice(-memory);
  writeJson(store, RECENT_WORDS_KEY, recentByCat);
  return word;
}

/* ------------------------------------------------------------------ */
/* Reparto de fingidazos: máximo 2 partidas seguidas por jugador       */
/* ------------------------------------------------------------------ */

// Se conserva la clave original para no perder las rachas guardadas.
const STREAKS_KEY = "el-impostor:impostor-streaks:v1";
const MAX_CONSECUTIVE_IMPOSTOR_MATCHES = 2;
const MAX_STORED_ROSTERS = 20;

function rosterKey(config: GameConfig) {
  const names = config.names.map((n, i) => n.trim().toLocaleLowerCase("es") || `jugador-${i + 1}`);
  return `${config.players}::${names.join("|")}`;
}

function pickImpostors(config: GameConfig): number[] {
  const store = storage("local");
  const all = readJson<Record<string, number[]>>(store, STREAKS_KEY) ?? {};
  const key = rosterKey(config);
  const saved = all[key];
  const streaks = Array.from({ length: config.players }, (_, i) => {
    const v = Array.isArray(saved) ? saved[i] : 0;
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  });

  const chosen = new Set<number>();
  const draw = (candidates: number[]) => {
    const pool = candidates.filter((i) => !chosen.has(i));
    while (chosen.size < config.impostors && pool.length) {
      chosen.add(pool.splice(randomIndex(pool.length), 1)[0]);
    }
  };
  draw(streaks.flatMap((s, i) => (s < MAX_CONSECUTIVE_IMPOSTOR_MATCHES ? [i] : [])));
  // Respaldo: si casi todos están "quemados", igual se completa el cupo.
  draw(streaks.map((_, i) => i));

  // Reinsertar la clave al final la marca como la más reciente; se descartan las viejas.
  delete all[key];
  all[key] = streaks.map((s, i) => (chosen.has(i) ? Math.min(MAX_CONSECUTIVE_IMPOSTOR_MATCHES, s + 1) : 0));
  const keys = Object.keys(all);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_STORED_ROSTERS))) delete all[old];
  writeJson(store, STREAKS_KEY, all);

  return [...chosen].sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/* Ronda: vive en sessionStorage, nunca en la URL                      */
/* ------------------------------------------------------------------ */

export type Round = {
  id: string;
  category: string;
  secret: string;
  /** Índices (base 0) de los fingidazos. */
  impostors: number[];
  config: GameConfig;
  /** Progreso del reparto de cartas, para que recargar no re-sortee. */
  progress: { current: number; revealed: boolean };
  /** Quién abre la ronda; se fija una vez para que recargar no lo cambie. */
  starter?: { index: number; direction: "izquierda" | "derecha" };
};

const ROUNDS_KEY = "fingidazo:rounds:v1";
const MAX_STORED_ROUNDS = 5;

function newRoundId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export function pickStarter(players: number): NonNullable<Round["starter"]> {
  return { index: randomIndex(players), direction: randomIndex(2) === 0 ? "izquierda" : "derecha" };
}

export function createRound(config: GameConfig, category: string): Round {
  const round: Round = {
    id: newRoundId(),
    category,
    secret: pickSecretWord(category),
    impostors: pickImpostors(config),
    config,
    progress: { current: 0, revealed: false },
  };
  saveRound(round);
  return round;
}

function isRound(value: unknown): value is Round {
  const r = value as Round;
  return (
    !!r &&
    typeof r.id === "string" &&
    typeof r.secret === "string" &&
    typeof r.category === "string" &&
    Array.isArray(r.impostors) &&
    !!r.config &&
    Array.isArray(r.config.names) &&
    !!r.progress
  );
}

/*
 * Se guardan las últimas rondas por id (no solo la actual) para que crear una
 * nueva no invalide la pantalla que todavía está abierta mientras se navega.
 */
const EMPTY: Round[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedRounds: Round[] = EMPTY;

function readStoredRounds(): Round[] {
  let raw: string | null = null;
  try {
    raw = storage("session")?.getItem(ROUNDS_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cachedRounds = Array.isArray(parsed) ? parsed.filter(isRound) : EMPTY;
    } catch {
      cachedRounds = EMPTY;
    }
  }
  return cachedRounds;
}

export function saveRound(round: Round) {
  const others = readStoredRounds().filter((r) => r.id !== round.id);
  writeJson(storage("session"), ROUNDS_KEY, [...others, round].slice(-MAX_STORED_ROUNDS));
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

function getServerSnapshot(): Round[] | undefined {
  return undefined;
}

/**
 * Lee una ronda guardada por id.
 * - `undefined`: todavía hidratando (en servidor no hay sessionStorage).
 * - `null`: no existe en esta pestaña (enlace viejo, otra pestaña…).
 */
export function useRound(id: string | null): Round | null | undefined {
  const rounds = useSyncExternalStore<Round[] | undefined>(subscribe, readStoredRounds, getServerSnapshot);
  if (rounds === undefined) return undefined;
  return rounds.find((r) => r.id === id) ?? null;
}
