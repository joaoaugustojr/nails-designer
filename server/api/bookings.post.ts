import { bookingSchema } from "#shared/schemas/booking";

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, "booking", { limit: 10, windowMinutes: 10 });
  const input = await readValidatedBody(event, bookingSchema.parse);
  return createBooking(input);
});
