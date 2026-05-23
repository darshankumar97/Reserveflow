import { getReservationById } from "@/lib/data/reservation";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  parseRouteParams,
  reservationIdParamsSchema,
} from "@/lib/validations/api";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (_request, context) => {
  const { id } = await parseRouteParams(context.params, reservationIdParamsSchema);
  const reservation = await getReservationById(id);
  return { reservation };
});
