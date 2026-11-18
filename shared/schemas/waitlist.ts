import { z } from "zod";

import { honeypotField, nameField, phoneField } from "./fields";

export const WAITLIST_MAX_DAYS = 5;
export const WAITLIST_NOTE_MAX_LENGTH = 200;
export const WAITLIST_PERIODS = ["morning", "afternoon", "evening"] as const;

export type WaitlistPeriod = (typeof WAITLIST_PERIODS)[number];

export const waitlistSchema = z.object({
  serviceId: z.number().int().positive(),
  name: nameField,
  phone: phoneField,
  dates: z
    .array(z.iso.date())
    .min(1)
    .max(WAITLIST_MAX_DAYS)
    .refine((dates) => new Set(dates).size === dates.length)
    .transform((dates) => dates.toSorted()),
  periods: z
    .array(z.enum(WAITLIST_PERIODS))
    .min(1)
    .refine((periods) => new Set(periods).size === periods.length),
  note: z.string().trim().max(WAITLIST_NOTE_MAX_LENGTH),
  website: honeypotField,
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
