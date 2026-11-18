import { z } from "zod";

import { nameField } from "./fields";

export const PASSWORD_MIN_LENGTH = 8;

export const emailField = z.string().trim().toLowerCase().pipe(z.email());
const newPasswordField = z.string().min(PASSWORD_MIN_LENGTH).max(200);

export const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(200) });

export const newUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: newPasswordField,
});

export const profileSchema = z.object({ name: nameField });

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: newPasswordField,
});

export const passwordResetSchema = z.object({ password: newPasswordField });
