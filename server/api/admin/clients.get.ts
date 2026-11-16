import { z } from "zod";

const querySchema = z.object({
  search: z.string().trim().max(80).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  return listClients(await getValidatedQuery(event, querySchema.parse));
});
