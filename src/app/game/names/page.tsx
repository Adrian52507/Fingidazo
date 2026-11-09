import { Suspense } from "react";
import NamesClient from "./names-client";
import { LoadingOverlay } from "../LoadingOverlay";

export default function NamesPage() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <NamesClient />
    </Suspense>
  );
}
