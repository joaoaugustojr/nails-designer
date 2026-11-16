import type { User } from "#auth-utils";

// The security boundary for the panel: every /api/admin/** request needs a live user.
// The page middleware in app/ only redirects; it protects nothing.
export default defineEventHandler(async (event) => {
  if (event.path.startsWith("/api/admin/")) {
    event.context.panelUser = await requirePanelUser(event);
  }
});

declare module "h3" {
  interface H3EventContext {
    panelUser?: User;
  }
}
