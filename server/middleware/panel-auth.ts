// The security boundary for the panel: every /api/admin/** request needs a live user.
// The page middleware in app/ only redirects; it protects nothing.
export default defineEventHandler(async (event) => {
  if (event.path.startsWith("/api/admin/")) {
    event.context.panelUser = await requirePanelUser(event);
  }
});

declare module "h3" {
  interface H3EventContext {
    panelUser?: { id: number; name: string; email: string; role: "owner" | "admin" };
  }
}
