import { newUserSchema } from "#shared/schemas/user";

export default defineEventHandler(async (event) => {
  requireOwner(event);
  return createPanelUser(await readValidatedBody(event, newUserSchema.parse));
});
