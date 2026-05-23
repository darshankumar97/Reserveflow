import { Header } from "@/components/layout/header";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function InventoryLoading() {
  return (
    <>
      <Header title="Inventory" description="Loading stock levels..." />
      <TableSkeleton columns={5} />
    </>
  );
}
