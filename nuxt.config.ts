import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "shadcn-nuxt", "nuxt-auth-utils", "@nuxtjs/color-mode"],
  css: ["~/assets/css/main.css", "~/assets/css/brand.css"],

  // Overridden by env vars (NUXT_DB_URL, NUXT_ADMIN_EMAIL, …); see .env.example.
  runtimeConfig: {
    dbUrl: "file:.data/nails.db",
    storeName: "",
    uploadsDir: ".data/uploads",
    admin: { name: "", email: "", password: "" },
    session: { maxAge: 60 * 60 * 24 * 7 },
  },

  // `dark` / `light` class on <html>, matching shadcn's `.dark` variant.
  colorMode: {
    classSuffix: "",
    storageKey: "color-mode",
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
