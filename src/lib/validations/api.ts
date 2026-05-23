import { z } from "zod";

export const createReservationBodySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  productId: z.string().min(1, "productId is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
  reference: z.string().trim().min(1).optional(),
});

export const releaseReservationBodySchema = z.object({
  reason: z
    .enum(["cancelled", "expired", "payment_failed"])
    .default("cancelled"),
});

export const reservationIdParamsSchema = z.object({
  id: z.string().min(1, "Reservation id is required"),
});

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const text = await request.text();

  if (!text.trim()) {
    return schema.parse({});
  }

  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Request body must be valid JSON",
        path: [],
      },
    ]);
  }

  return schema.parse(json);
}

export async function parseRouteParams<T extends z.ZodType>(
  params: Promise<Record<string, string>>,
  schema: T,
): Promise<z.infer<T>> {
  return schema.parse(await params);
}
