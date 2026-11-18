import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint", "shadcn-nuxt", "nuxt-auth-utils", "@nuxtjs/color-mode"],
  css: ["~/assets/css/main.css", "~/assets/css/brand.css"],

  app: {
    head: { htmlAttrs: { lang: "pt-BR" } },
  },

  // Overridden by env vars (NUXT_DB_URL, NUXT_ADMIN_EMAIL, …); see .env.example.
  runtimeConfig: {
    dbUrl: "file:.data/nails.db",
    storeName: "",
    uploadsDir: ".data/uploads",
    siteUrl: "http://localhost:3000",
    admin: { name: "", email: "", password: "" },
    session: { maxAge: 60 * 60 * 24 * 7 },
    vapidPrivateKey: "",
    public: { isWhatsappEnabled: false, vapidPublicKey: "" },
  },

  // `dark` / `light` class on <html>, matching shadcn's `.dark` variant.
  // Follows the device (light/dark) until the person picks a theme.
  colorMode: {
    preference: "system",
    fallback: "light",
    classSuffix: "",
    storageKey: "color-mode",
    disableTransition: true,
  },

  nitro: {
    experimental: { tasks: true },
    // Each run sends what is due; reminders go out at most 1 minute late.
    scheduledTasks: { "* * * * *": ["reminders:send"] },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },
});
