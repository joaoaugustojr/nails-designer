import { ACCENT_COLORS, DEFAULT_ACCENT } from "#shared/schemas/store";

// `html:root` / `html.dark` outrank brand.css (`:root` / `.dark`) whatever the stylesheet order.
function accentCss(accentColor: string | null | undefined) {
  const accent = ACCENT_COLORS.find((color) => color.light === accentColor) ?? DEFAULT_ACCENT;
  return [
    `html:root{--primary:${accent.light};--ring:${accent.light}}`,
    `html.dark{--primary:${accent.dark};--ring:${accent.dark}}`,
  ].join("");
}

export default defineNuxtPlugin(async () => {
  const { data: store } = await useStoreInfo();
  useHead({
    style: [
      { key: "brand-accent", textContent: computed(() => accentCss(store.value?.accentColor)) },
    ],
  });
});
