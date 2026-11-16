import { z } from "zod";

export const AVAILABILITY_MAX_DAYS = 14;

export const availabilityQuerySchema = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(AVAILABILITY_MAX_DAYS).default(6),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
