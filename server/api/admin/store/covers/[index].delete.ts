import { z } from "zod";

const paramsSchema = z.object({ index: z.coerce.number().int().min(0) });

export default defineEventHandler(async (event) => {
  requireOwner(event);
  const { index } = await getValidatedRouterParams(event, paramsSchema.parse);
  await deleteStoreCover(index);
  return { ok: true };
});
