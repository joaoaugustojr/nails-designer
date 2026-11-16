import { z } from "zod";

import { MINUTES_PER_DAY } from "../utils/time";
import { emailField, nameField } from "./user";

export const AVAILABILITY_MAX_DAYS = 14;

export const availabilityQuerySchema = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(AVAILABILITY_MAX_DAYS).default(6),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

const MOBILE_PATTERN = /^\d{2}9\d{8}$/;

export const bookingSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.iso.date(),
  startMinute: z.number().int().min(0).max(MINUTES_PER_DAY),
  name: nameField,
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => MOBILE_PATTERN.test(digits)),
  email: z.union([z.literal(""), emailField]),
  remindersOptIn: z.boolean(),
  idempotencyKey: z.uuid(),
  website: z.string().max(0),
});

export type BookingInput = z.infer<typeof bookingSchema>;
