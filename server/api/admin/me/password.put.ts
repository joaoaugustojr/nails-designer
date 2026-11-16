import { passwordChangeSchema } from "#shared/schemas/user";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, passwordChangeSchema.parse);
  await changeOwnPassword(event, input);
  return { ok: true };
});
