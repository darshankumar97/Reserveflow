import { Header } from "@/components/layout/header";
import { InventoryWorkspace } from "@/components/inventory/inventory-workspace";
import { getInventoryGroupedByWarehouse } from "@/lib/data/catalog";

export default async function InventoryPage() {
  const groups = await getInventoryGroupedByWarehouse();

  return (
    <>
      <Header
        title="Inventory"
        description="Reserve stock by warehouse. Available quantity is computed live."
      />
      <InventoryWorkspace groups={groups} />
    </>
  );
}
