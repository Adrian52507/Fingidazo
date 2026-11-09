"use client";

import { useRouter } from "next/navigation";

/** Se muestra si se abre /play o /match sin una ronda válida en esta pestaña. */
export function RoundMissing() {
  const router = useRouter();
  return (
    <main className="w-full h-screen h-dvh flex items-center justify-center p-4">
      <div
        role="alert"
        style={{ border: "1px solid var(--g)", padding: 20, maxWidth: 520, width: "100%", textAlign: "center" }}
      >
        <p style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase" }}>Ronda no encontrada</p>
        <p style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
          Esta partida ya no existe en este dispositivo o el enlace es de otra pestaña. Configura una nueva para seguir
          jugando.
        </p>
        <button className="term-btn" style={{ marginTop: 18, textTransform: "uppercase" }} onClick={() => router.push("/game")}>
          Nueva partida
        </button>
      </div>
    </main>
  );
}
