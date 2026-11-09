import { Suspense } from "react";
import GameClient from "./game-client";
import { LoadingOverlay } from "./LoadingOverlay";

export default function GamePage() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <GameClient />
    </Suspense>
  );
}
