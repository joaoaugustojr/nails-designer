import { z } from "zod";

const cancelSchema = z.object({ notifyClient: z.boolean() });

export default defineEventHandler(async (event) => {
  const { notifyClient } = await readValidatedBody(event, cancelSchema.parse);
  await cancelBooking(readIdParam(event), { notifyClient });
  return { ok: true };
});
