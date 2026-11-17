import { ACCENT_COLORS, DEFAULT_ACCENT } from "#shared/schemas/store";

// `html:root` / `html.dark` outrank brand.css (`:root` / `.dark`) whatever the stylesheet order.
function accentCss(accentColor: string | null | undefined) {
  const accent = ACCENT_COLORS.find((color) => color.light === accentColor) ?? DEFAULT_ACCENT;
  return [
    `html:root{--primary:${accent.light};--ring:${accent.light}}`,
    `html.dark{--primary:${accent.dark};--ring:${accent.dark}}`,
  ].join("");
}

function useThemeColor() {
  const colorMode = useColorMode();
  const themeColor = ref<string>();
  if (import.meta.client) {
    watch(
      () => colorMode.value,
      () => nextTick(() => (themeColor.value = getComputedStyle(document.body).backgroundColor)),
      { immediate: true },
    );
  }
  return themeColor;
}

export default defineNuxtPlugin(async () => {
  const { data: store } = await useStoreInfo();
  const { origin } = useRequestURL({ xForwardedHost: true, xForwardedProto: true });
  const name = computed(() => store.value?.name ?? "");
  const absolute = (path: string | null | undefined) => (path ? `${origin}${path}` : undefined);
  const themeColor = useThemeColor();

  useHead({
    titleTemplate: (title) =>
      title && name.value ? `${title} · ${name.value}` : title || name.value,
    style: [
      { key: "brand-accent", textContent: computed(() => accentCss(store.value?.accentColor)) },
    ],
    link: [
      {
        key: "icon",
        rel: "icon",
        href: computed(() => store.value?.logoPath ?? "/favicon.ico"),
      },
    ],
    meta: [{ key: "theme-color", name: "theme-color", content: themeColor }],
  });

  useSeoMeta({
    ogType: "website",
    ogSiteName: name,
    ogTitle: name,
    description: () => store.value?.about ?? undefined,
    ogDescription: () => store.value?.about ?? undefined,
    ogImage: () => absolute(store.value?.coverPaths[0] ?? store.value?.logoPath),
    twitterCard: () => (store.value?.coverPaths.length ? "summary_large_image" : "summary"),
  });
});
