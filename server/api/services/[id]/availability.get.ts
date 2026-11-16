import { availabilityQuerySchema } from "#shared/schemas/booking";

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, availabilityQuerySchema.parse);
  return findServiceAvailability(readIdParam(event), query);
});
