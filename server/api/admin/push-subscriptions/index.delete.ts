const bodySchema = pushSubscriptionSchema.pick({ endpoint: true });

export default defineEventHandler(async (event) => {
  const { endpoint } = await readValidatedBody(event, bodySchema.parse);
  await deletePushSubscription(currentPanelUser(event).id, endpoint);
  return { ok: true };
});
