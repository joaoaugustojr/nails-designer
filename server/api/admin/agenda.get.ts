import { z } from "zod";

const querySchema = z.object({ date: z.iso.date().optional() });

export default defineEventHandler(async (event) => {
  const { date } = await getValidatedQuery(event, querySchema.parse);
  return getAgenda(date);
});
