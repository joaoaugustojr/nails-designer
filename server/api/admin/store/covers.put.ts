import { z } from "zod";

import { STORE_MAX_COVERS } from "#shared/schemas/store";

const bodySchema = z.object({ paths: z.array(z.string()).max(STORE_MAX_COVERS) });

export default defineEventHandler(async (event) => {
  requireOwner(event);
  const { paths } = await readValidatedBody(event, bodySchema.parse);
  await reorderStoreCovers(paths);
  return { ok: true };
});
