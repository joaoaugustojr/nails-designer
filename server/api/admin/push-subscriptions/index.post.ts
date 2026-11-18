export default defineEventHandler(async (event) => {
  const subscription = await readValidatedBody(event, pushSubscriptionSchema.parse);
  await savePushSubscription(currentPanelUser(event).id, subscription);
  return { ok: true };
});
