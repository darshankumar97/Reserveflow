import { Header } from "@/components/layout/header";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function ReservationsLoading() {
  return (
    <>
      <Header title="Reservations" description="Loading reservations..." />
      <TableSkeleton columns={5} />
    </>
  );
}
