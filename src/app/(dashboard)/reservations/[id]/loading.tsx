import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReservationDetailLoading() {
  return (
    <>
      <Header title="Reservation" description="Loading reservation…" />
      <div className="space-y-4 p-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full max-w-sm rounded-lg" />
      </div>
    </>
  );
}
