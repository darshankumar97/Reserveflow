"use client";

import { PageError } from "@/components/dashboard/page-error";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <PageError
        title="Application error"
        message={error.message || "An unexpected error occurred."}
        reset={reset}
      />
    </div>
  );
}
