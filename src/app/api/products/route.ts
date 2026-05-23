import { listProducts } from "@/lib/data/catalog";
import { withApiHandler } from "@/lib/api/route-handler";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () => {
  const products = await listProducts();
  return { products };
});
