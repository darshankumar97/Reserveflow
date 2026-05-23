import { confirmReservation } from "@/lib/services/reservation";
import { withIdempotentPost } from "@/lib/api/idempotent-route";
import { canonicalizeJson } from "@/lib/idempotency/hash";
import {
  parseRouteParams,
  reservationIdParamsSchema,
} from "@/lib/validations/api";

export const dynamic = "force-dynamic";

export const POST = withIdempotentPost(
  "reservations:confirm",
  "confirm_reservation",
  async (_request, context) => {
    const { id } = await parseRouteParams(
      context.params,
      reservationIdParamsSchema,
    );

    const reservation = await confirmReservation({ reservationId: id });

    return { reservation };
  },
  {
    getRequestPayload: async (_request, context) => {
      const { id } = await parseRouteParams(
        context.params,
        reservationIdParamsSchema,
      );

      return canonicalizeJson({ reservationId: id });
    },
  },
);
