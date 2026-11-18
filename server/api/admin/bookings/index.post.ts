import { panelBookingSchema } from "#shared/schemas/booking";

export default defineEventHandler(async (event) => {
  return createPanelBooking(await readValidatedBody(event, panelBookingSchema.parse));
});
