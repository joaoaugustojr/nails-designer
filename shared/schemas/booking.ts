import { z } from "zod";

import { MINUTES_PER_DAY } from "../utils/time";
import { honeypotField, nameField, phoneField } from "./fields";
import { SERVICE_MAX_PRICE_CENTS } from "./service";

export const AVAILABILITY_MAX_DAYS = 14;

export const availabilityQuerySchema = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(AVAILABILITY_MAX_DAYS).default(6),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const bookingSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.iso.date(),
  startMinute: z.number().int().min(0).max(MINUTES_PER_DAY),
  name: nameField,
  phone: phoneField,
  remindersOptIn: z.boolean(),
  idempotencyKey: z.uuid(),
  website: honeypotField,
});

export type BookingInput = z.infer<typeof bookingSchema>;

// The owner books any day and time, open or not; only another booking blocks it.
export const panelBookingSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.iso.date(),
  startMinute: z
    .number()
    .int()
    .min(0)
    .max(MINUTES_PER_DAY - 1),
  priceCents: z.number().int().min(0).max(SERVICE_MAX_PRICE_CENTS),
  name: nameField,
  phone: phoneField,
  remindersOptIn: z.boolean(),
});

export type PanelBookingInput = z.infer<typeof panelBookingSchema>;
