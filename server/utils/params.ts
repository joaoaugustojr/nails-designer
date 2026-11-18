import type { H3Event } from "h3";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

export function readIdParam(event: H3Event, name = "id") {
  const parsed = idSchema.safeParse(getRouterParam(event, name));
  if (!parsed.success) throw createError({ statusCode: 404 });
  return parsed.data;
}

// Generous upper bound: the owner reorders her own catalog, never thousands of rows.
const MAX_ORDERED_IDS = 500;
const orderSchema = z.object({ ids: z.array(idSchema).min(1).max(MAX_ORDERED_IDS) });

export async function readOrderBody(event: H3Event) {
  const { ids } = await readValidatedBody(event, orderSchema.parse);
  return ids;
}
