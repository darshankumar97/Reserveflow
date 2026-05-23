"use client";

import { Button } from "@/components/ui/button";

type PageErrorProps = {
  title?: string;
  message?: string;
  reset?: () => void;
};

export function PageError({
  title = "Something went wrong",
  message = "Unable to load this view. Try again or contact support if the issue persists.",
  reset,
}: PageErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      {reset ? (
        <Button variant="outline" onClick={reset}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
