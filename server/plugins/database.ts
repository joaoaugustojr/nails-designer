// Run migrations at boot instead of on the first request; a broken database stops the server.
export default defineNitroPlugin(() => {
  useDb().catch((error) => {
    console.error("Database setup failed:", error);
    process.exit(1);
  });
});
