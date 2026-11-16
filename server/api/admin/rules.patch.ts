import { rulesSchema } from "#shared/schemas/schedule";

export default defineEventHandler(async (event) => {
  await updateRules(await readValidatedBody(event, rulesSchema.parse));
  return { ok: true };
});
