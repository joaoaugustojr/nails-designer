import { storeSchema } from "#shared/schemas/store";

export default defineEventHandler(async (event) => {
  requireOwner(event);
  await updateStoreSettings(await readValidatedBody(event, storeSchema.parse));
  return { ok: true };
});
