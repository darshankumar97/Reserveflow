"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const WARNING_MS = 2 * 60 * 1000;
const CRITICAL_MS = 30 * 1000;

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type Urgency = "normal" | "warning" | "critical" | "expired";

function getUrgency(remainingMs: number, isExpired: boolean): Urgency {
  if (isExpired) {
    return "expired";
  }

  if (remainingMs <= CRITICAL_MS) {
    return "critical";
  }

  if (remainingMs <= WARNING_MS) {
    return "warning";
  }

  return "normal";
}

const urgencyStyles: Record<Urgency, string> = {
  normal: "border bg-muted/40",
  warning: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20",
  critical: "border-destructive/50 bg-destructive/5",
  expired: "border-destructive/30 bg-destructive/5",
};

const urgencyTextStyles: Record<Urgency, string> = {
  normal: "text-foreground",
  warning: "text-amber-900 dark:text-amber-200",
  critical: "text-destructive",
  expired: "text-destructive",
};

type ExpirationCountdownProps = {
  expiresAt: string;
  status: string;
  onExpired: () => void;
};

export function ExpirationCountdown({
  expiresAt,
  status,
  onExpired,
}: ExpirationCountdownProps) {
  const expiresAtMs = new Date(expiresAt).getTime();
  const [remainingMs, setRemainingMs] = React.useState(
    () => expiresAtMs - Date.now(),
  );
  const expiredHandledRef = React.useRef(false);

  React.useEffect(() => {
    if (status !== "PENDING") {
      return;
    }

    const tick = () => {
      const next = expiresAtMs - Date.now();
      setRemainingMs(next);

      if (next <= 0 && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        onExpired();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAtMs, onExpired, status]);

  const isExpired = status === "EXPIRED" || remainingMs <= 0;
  const isPending = status === "PENDING";
  const urgency = getUrgency(remainingMs, isExpired);

  if (!isPending && status !== "EXPIRED") {
    return null;
  }

  return (
    <div className={cn("rounded-md border px-3 py-2", urgencyStyles[urgency])}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {isExpired
          ? "Expired"
          : urgency === "critical"
            ? "Expiring soon"
            : urgency === "warning"
              ? "Expiring shortly"
              : "Expires in"}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums",
          urgencyTextStyles[urgency],
        )}
      >
        {isExpired ? "Reservation window closed" : formatRemaining(remainingMs)}
      </p>
    </div>
  );
}
