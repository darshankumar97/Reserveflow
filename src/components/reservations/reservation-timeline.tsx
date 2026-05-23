import type { ReservationTimelineEvent } from "@/lib/data/reservation";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const eventStyles: Record<ReservationTimelineEvent["type"], string> = {
  created: "bg-primary",
  confirmed: "bg-emerald-500",
  released: "bg-muted-foreground",
  expired: "bg-destructive",
};

type ReservationTimelineProps = {
  events: ReservationTimelineEvent[];
};

export function ReservationTimeline({ events }: ReservationTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event, index) => (
        <li key={`${event.type}-${event.timestamp.toISOString()}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 size-2 rounded-full",
                eventStyles[event.type],
              )}
            />
            {index < events.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium">{event.label}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(event.timestamp)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
