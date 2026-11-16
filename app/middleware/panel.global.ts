// UX only: sends visitors without a session to the login page. The real check is
// server/middleware/panel-auth.ts, which guards every /api/admin/** request.
export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith("/admin")) return;

  const { loggedIn } = useUserSession();
  const isLogin = to.path === "/admin/login";

  if (!loggedIn.value && !isLogin) return navigateTo("/admin/login");
  if (loggedIn.value && isLogin) return navigateTo("/admin");
});
