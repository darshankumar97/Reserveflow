import { listWarehouses } from "@/lib/data/catalog";
import { withApiHandler } from "@/lib/api/route-handler";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () => {
  const warehouses = await listWarehouses();
  return { warehouses };
});
