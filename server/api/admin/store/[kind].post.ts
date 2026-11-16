import { z } from "zod";

import { STORE_IMAGE_KINDS } from "#shared/schemas/store";

const paramsSchema = z.object({ kind: z.enum(STORE_IMAGE_KINDS) });

export default defineEventHandler(async (event) => {
  requireOwner(event);
  const { kind } = await getValidatedRouterParams(event, paramsSchema.parse);
  const parts = (await readMultipartFormData(event)) ?? [];
  const image = parts.find((part) => part.name === "image");
  if (!image) throw createError({ statusCode: 400, statusMessage: "No image" });
  return replaceStoreImage(kind, image.data);
});
