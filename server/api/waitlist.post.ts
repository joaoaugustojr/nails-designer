import { waitlistSchema } from "#shared/schemas/waitlist";

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, "waitlist", { limit: 5, windowMinutes: 10 });
  await createWaitlistRequest(await readValidatedBody(event, waitlistSchema.parse));
  return { ok: true };
});
