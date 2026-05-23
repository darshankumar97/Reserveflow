import { Header } from "@/components/layout/header";
import { ConcurrencySimulator } from "@/components/tools/concurrency-simulator";
import { getInventoryGroupedByWarehouse } from "@/lib/data/catalog";

export default async function ConcurrencyToolsPage() {
  const groups = await getInventoryGroupedByWarehouse();

  const items = groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      warehouseCode: group.warehouse.code,
      warehouseName: group.warehouse.name,
    })),
  );

  return (
    <>
      <Header
        title="Concurrency tools"
        description="Internal utilities for validating reservation correctness under parallel load."
      />
      <div className="p-6">
        <ConcurrencySimulator items={items} />
      </div>
    </>
  );
}
