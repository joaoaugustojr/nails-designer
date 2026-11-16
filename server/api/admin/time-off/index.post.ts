import { timeOffSchema } from "#shared/schemas/schedule";

export default defineEventHandler(async (event) => {
  return createTimeOff(await readValidatedBody(event, timeOffSchema.parse));
});
