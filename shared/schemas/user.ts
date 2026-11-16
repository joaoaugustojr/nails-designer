import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const newUserSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

export const profileSchema = z.object({ name: z.string().trim().min(1).max(80) });

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

export const passwordResetSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
});

export type NewUserInput = z.infer<typeof newUserSchema>;
