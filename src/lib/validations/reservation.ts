import { z } from "zod";

export const createReservationSchema = z.object({
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  reference: z.string().trim().min(1).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
