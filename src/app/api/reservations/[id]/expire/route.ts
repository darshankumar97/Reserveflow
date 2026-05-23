import { expireReservation } from "@/lib/services/reservation";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  parseRouteParams,
  reservationIdParamsSchema,
} from "@/lib/validations/api";

export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (_request, context) => {
  const { id } = await parseRouteParams(context.params, reservationIdParamsSchema);

  const reservation = await expireReservation({ reservationId: id });

  return { reservation };
});
