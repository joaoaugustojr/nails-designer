export default defineEventHandler((event) =>
  getBookingSummary(getRouterParam(event, "token") ?? ""),
);
