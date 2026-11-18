import type { z } from "zod";

export function fieldMessages<Field extends string>(
  error: z.ZodError,
  messages: Record<Field, string>,
): Partial<Record<Field, string>> {
  const result: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field;
    if (field in messages) result[field] = messages[field];
  }
  return result;
}

export function errorStatus(error: unknown) {
  return (error as { statusCode?: number } | null)?.statusCode;
}

export const CLIENT_NAME_ERROR = "Informe o seu nome.";
export const PHONE_ERROR = "Informe o celular com DDD, por exemplo (11) 91234-5678.";
export const TOO_MANY_ATTEMPTS_ERROR =
  "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
