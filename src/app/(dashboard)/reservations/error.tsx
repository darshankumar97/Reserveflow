"use client";

import { PageError } from "@/components/dashboard/page-error";
import { Header } from "@/components/layout/header";

export default function ReservationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header title="Reservations" />
      <PageError
        message={error.message || "Failed to load reservations."}
        reset={reset}
      />
    </>
  );
}
