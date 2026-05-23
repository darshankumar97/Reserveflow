"use client";

import { PageError } from "@/components/dashboard/page-error";
import { Header } from "@/components/layout/header";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header title="Overview" />
      <PageError
        message={error.message || "Failed to load dashboard data."}
        reset={reset}
      />
    </>
  );
}
