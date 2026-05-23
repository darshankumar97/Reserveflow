import {
  RELEASE_REASON_MAP,
  releaseReservation,
} from "@/lib/services/reservation";
import { withApiHandler } from "@/lib/api/route-handler";
import {
  parseJsonBody,
  parseRouteParams,
  releaseReservationBodySchema,
  reservationIdParamsSchema,
} from "@/lib/validations/api";

export const dynamic = "force-dynamic";

export const POST = withApiHandler(async (request, context) => {
  const { id } = await parseRouteParams(context.params, reservationIdParamsSchema);
  const body = await parseJsonBody(request, releaseReservationBodySchema);

  const reservation = await releaseReservation({
    reservationId: id,
    reason: RELEASE_REASON_MAP[body.reason],
  });

  return { reservation };
});
