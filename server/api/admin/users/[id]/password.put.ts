import { passwordResetSchema } from "#shared/schemas/user";

export default defineEventHandler(async (event) => {
  requireOwner(event);
  const { password } = await readValidatedBody(event, passwordResetSchema.parse);
  await resetPanelUserPassword(await useDb(), readIdParam(event), await hashPassword(password));
  return { ok: true };
});
