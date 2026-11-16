import { dayRangesSchema, weekdayParamsSchema } from "#shared/schemas/schedule";

export default defineEventHandler(async (event) => {
  const { weekday } = await getValidatedRouterParams(event, weekdayParamsSchema.parse);
  const { ranges } = await readValidatedBody(event, dayRangesSchema.parse);
  await replaceDayRanges(weekday, ranges);
  return { ok: true };
});
