export default defineTask({
  meta: { name: "reminders:send", description: "Send the WhatsApp reminders that are due" },
  async run() {
    return { result: await sendDueReminders() };
  },
});
