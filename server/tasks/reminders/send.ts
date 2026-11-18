export default defineTask({
  meta: { name: "reminders:send", description: "Send the reminders that are due" },
  async run() {
    const clients = await sendDueReminders();
    const owner = await sendDueOwnerReminders();
    return { result: { clients, owner } };
  },
});
