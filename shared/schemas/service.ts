import { z } from "zod";

export const SERVICE_DURATION_STEP_MINUTES = 15;
export const SERVICE_MAX_DURATION_MINUTES = 8 * 60;
export const SERVICE_MAX_PRICE_CENTS = 100_000_00;
export const SERVICE_MAX_PHOTOS = 10;

export const SERVICE_DURATIONS = Array.from(
  { length: SERVICE_MAX_DURATION_MINUTES / SERVICE_DURATION_STEP_MINUTES },
  (_, index) => (index + 1) * SERVICE_DURATION_STEP_MINUTES,
);

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  details: z.string().trim().max(2000),
  includes: z.string().trim().max(2000),
  priceCents: z.number().int().min(0).max(SERVICE_MAX_PRICE_CENTS),
  durationMinutes: z
    .number()
    .int()
    .min(SERVICE_DURATION_STEP_MINUTES)
    .max(SERVICE_MAX_DURATION_MINUTES)
    .multipleOf(SERVICE_DURATION_STEP_MINUTES),
  active: z.boolean(),
});

export const serviceChangesSchema = serviceSchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, "No changes");

export type ServiceInput = z.infer<typeof serviceSchema>;
