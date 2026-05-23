"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ExpirationCountdown } from "@/components/reservations/expiration-countdown";
import { ReservationTimeline } from "@/components/reservations/reservation-timeline";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ReservationView } from "@/lib/data/reservation";
import {
  ApiRequestError,
  confirmReservationApi,
  expireReservationApi,
  fetchReservationApi,
  getApiErrorMessage,
  releaseReservationApi,
} from "@/lib/api/client";
import { formatDate, formatNumber } from "@/lib/utils";
import { useToast } from "@/components/providers/toast-provider";
import type { ReservationStatus } from "@prisma/client";

type ReservationDetailClientProps = {
  initial: ReservationView;
};

export function ReservationDetailClient({
  initial,
}: ReservationDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reservation, setReservation] = React.useState(initial);
  const [banner, setBanner] = React.useState<{
    variant: "warning" | "destructive";
    title: string;
    description: string;
  } | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [expiring, setExpiring] = React.useState(false);
  const [hasExpired, setHasExpired] = React.useState(
    () => initial.status === "EXPIRED",
  );

  const refreshReservation = React.useCallback(async () => {
    const latest = await fetchReservationApi(reservation.id);
    const nextStatus = latest.status as ReservationStatus;

    setReservation({
      ...latest,
      expiresAt: new Date(latest.expiresAt),
      confirmedAt: latest.confirmedAt ? new Date(latest.confirmedAt) : null,
      releasedAt: latest.releasedAt ? new Date(latest.releasedAt) : null,
      createdAt: new Date(latest.createdAt),
      status: nextStatus,
      timeline: latest.timeline.map((event) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })),
    });

    if (nextStatus === "EXPIRED") {
      setHasExpired(true);
    }

    router.refresh();
  }, [reservation.id, router]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshReservation().catch(() => undefined);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refreshReservation]);

  const isPending = reservation.status === "PENDING";
  const isExpired = reservation.status === "EXPIRED" || hasExpired;
  const canConfirm = isPending && !isExpired && !confirming && !cancelling;
  const canCancel =
    isPending && !isExpired && !confirming && !cancelling && !expiring;

  const handleConfirm = async () => {
    setBanner(null);
    setConfirming(true);

    try {
      await confirmReservationApi(reservation.id);
      toast({
        title: "Reservation confirmed",
        description: "Stock has been allocated.",
        variant: "success",
      });
      await refreshReservation();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBanner({
        variant:
          error instanceof ApiRequestError &&
          error.code === "RESERVATION_EXPIRED"
            ? "destructive"
            : "warning",
        title:
          error instanceof ApiRequestError &&
          error.code === "RESERVATION_EXPIRED"
            ? "Reservation expired"
            : "Unable to confirm",
        description: message,
      });
      toast({
        title: "Confirmation failed",
        description: message,
        variant: "error",
      });
      await refreshReservation().catch(() => undefined);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setBanner(null);
    setCancelling(true);

    try {
      await releaseReservationApi(reservation.id, "cancelled");
      toast({
        title: "Reservation cancelled",
        description: "Reserved stock has been released.",
        variant: "success",
      });
      await refreshReservation();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBanner({
        variant: "warning",
        title: "Unable to cancel",
        description: message,
      });
      toast({
        title: "Cancellation failed",
        description: message,
        variant: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleExpired = React.useCallback(async () => {
    if (expiring || reservation.status !== "PENDING") {
      return;
    }

    setExpiring(true);
    setBanner(null);

    try {
      await expireReservationApi(reservation.id);
      setHasExpired(true);
      setBanner({
        variant: "destructive",
        title: "Reservation expired",
        description:
          "The hold was released automatically. Confirm is no longer available.",
      });
      await refreshReservation();
    } catch (error) {
      await refreshReservation().catch(() => undefined);
      const message = getApiErrorMessage(error);
      setBanner({
        variant: "destructive",
        title: "Expiration update",
        description: message,
      });
    } finally {
      setExpiring(false);
    }
  }, [expiring, reservation.id, reservation.status, refreshReservation]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {banner ? (
        <Alert variant={banner.variant}>
          <AlertTitle>{banner.title}</AlertTitle>
          <AlertDescription>{banner.description}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6 rounded-lg border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Reference
              </p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {reservation.reference ?? reservation.id}
              </p>
            </div>
            <StatusBadge status={reservation.status as ReservationStatus} />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Product</dt>
              <dd className="mt-1 text-sm font-medium">
                {reservation.product.name}
              </dd>
              <dd className="font-mono text-xs text-muted-foreground">
                {reservation.product.sku}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Warehouse</dt>
              <dd className="mt-1 text-sm font-medium">
                {reservation.warehouse.name}
              </dd>
              <dd className="font-mono text-xs text-muted-foreground">
                {reservation.warehouse.code}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Quantity</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums">
                {formatNumber(reservation.quantity)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {formatDate(reservation.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium">Activity</h3>
            <div className="mt-4">
              <ReservationTimeline events={reservation.timeline} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              {confirming ? "Confirming…" : "Confirm purchase"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!canCancel}
            >
              {cancelling ? "Cancelling…" : "Cancel reservation"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/inventory">Back to inventory</Link>
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <ExpirationCountdown
            expiresAt={reservation.expiresAt.toISOString()}
            status={reservation.status}
            onExpired={() => {
              setHasExpired(true);
              void handleExpired();
            }}
          />

          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Available stock
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {formatNumber(reservation.availableQuantity)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Refreshes every 15s
            </p>
          </div>

          {reservation.confirmedAt ? (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <p className="text-xs text-muted-foreground">Confirmed at</p>
              <p className="mt-1">{formatDate(reservation.confirmedAt)}</p>
            </div>
          ) : null}

          {reservation.releasedAt ? (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <p className="text-xs text-muted-foreground">Released at</p>
              <p className="mt-1">{formatDate(reservation.releasedAt)}</p>
              {reservation.releaseReason ? (
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  Reason: {reservation.releaseReason.toLowerCase()}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
