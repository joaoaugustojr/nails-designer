import type { H3Event } from "h3";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export function readIdParam(event: H3Event, name = "id") {
  const parsed = idSchema.safeParse(getRouterParam(event, name));
  if (!parsed.success) throw createError({ statusCode: 404 });
  return parsed.data;
}
