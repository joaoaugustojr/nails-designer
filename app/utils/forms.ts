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
