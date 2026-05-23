"use client";

import { PageError } from "@/components/dashboard/page-error";
import { Header } from "@/components/layout/header";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header title="Inventory" />
      <PageError
        message={error.message || "Failed to load inventory."}
        reset={reset}
      />
    </>
  );
}
