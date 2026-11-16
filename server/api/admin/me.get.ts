// The guard in server/middleware/panel-auth.ts already loaded the user.
export default defineEventHandler((event) => event.context.panelUser);
