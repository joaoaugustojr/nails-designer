import { serviceChangesSchema } from "#shared/schemas/service";

export default defineEventHandler(async (event) => {
  const id = readIdParam(event);
  const changes = await readValidatedBody(event, serviceChangesSchema.parse);
  return updateService(id, changes);
});
