import { z } from "zod";

const MOBILE_PATTERN = /^\d{2}9\d{8}$/;

export const NAME_MAX_LENGTH = 80;

export const nameField = z.string().trim().min(1).max(NAME_MAX_LENGTH);

export const phoneField = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((digits) => MOBILE_PATTERN.test(digits));

// A field hidden from people: only bots fill it in.
export const honeypotField = z.string().max(0);
