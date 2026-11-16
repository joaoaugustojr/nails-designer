import { profileSchema } from "#shared/schemas/user";

export default defineEventHandler(async (event) => {
  const { name } = await readValidatedBody(event, profileSchema.parse);
  return updateOwnProfile(event, name);
});
