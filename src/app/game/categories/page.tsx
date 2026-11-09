import { Suspense } from "react";
import CategoriesClient from "./categories-client";
import { LoadingOverlay } from "../LoadingOverlay";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<LoadingOverlay />}>
      <CategoriesClient />
    </Suspense>
  );
}
