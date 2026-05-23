import { createReservation } from "@/lib/services/reservation";
import { withIdempotentPost } from "@/lib/api/idempotent-route";
import { logInventoryAction } from "@/lib/api/log-context";
import { createReservationBodySchema } from "@/lib/validations/api";

export const dynamic = "force-dynamic";

export const POST = withIdempotentPost(
  "reservations:create",
  "create_reservation",
  async (_request, _context, meta) => {
    const body = createReservationBodySchema.parse(
      JSON.parse(meta.requestBody || "{}"),
    );

    logInventoryAction({
      requestId: meta.requestId,
      actionType: "create_reservation",
      warehouseId: body.warehouseId,
      productId: body.productId,
    });

    const reservation = await createReservation({
      warehouseId: body.warehouseId,
      productId: body.productId,
      quantity: body.quantity,
      reference: body.reference,
    });

    return { reservation };
  },
);
