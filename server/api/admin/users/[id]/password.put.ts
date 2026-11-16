import { passwordResetSchema } from "#shared/schemas/user";

export default defineEventHandler(async (event) => {
  requireOwner(event);
  const { password } = await readValidatedBody(event, passwordResetSchema.parse);
  await resetPanelUserPassword(readIdParam(event), password);
  return { ok: true };
});
