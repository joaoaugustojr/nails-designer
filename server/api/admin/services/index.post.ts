import { serviceSchema } from "#shared/schemas/service";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, serviceSchema.parse);
  return createService(input);
});
