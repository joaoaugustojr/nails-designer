import { newUserSchema } from "#shared/schemas/user";

export default defineEventHandler(async (event) => {
  requireOwner(event);
  const { name, email, password } = await readValidatedBody(event, newUserSchema.parse);
  return createPanelUser(await useDb(), {
    name,
    email,
    passwordHash: await hashPassword(password),
  });
});
