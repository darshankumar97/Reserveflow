import type { ReservationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const statusVariant: Record<
  ReservationStatus,
  "warning" | "success" | "muted" | "destructive"
> = {
  PENDING: "warning",
  CONFIRMED: "success",
  RELEASED: "muted",
  EXPIRED: "destructive",
};

type StatusBadgeProps = {
  status: ReservationStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}
