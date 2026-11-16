import { refDebounced } from "@vueuse/core";

const SEARCH_DELAY_MS = 300;

export function useClients() {
  const search = ref("");
  const debouncedSearch = refDebounced(search, SEARCH_DELAY_MS);
  const query = computed(() => ({ search: debouncedSearch.value.trim() || undefined }));

  const { data: firstPage } = useFetch("/api/admin/clients", { query });
  type Client = NonNullable<typeof firstPage.value>["items"][number];

  const morePages = ref<Client[]>([]);
  const lastPageHasMore = ref<boolean | null>(null);
  const isLoadingMore = ref(false);

  watch(firstPage, () => {
    morePages.value = [];
    lastPageHasMore.value = null;
  });

  const clients = computed(() => [...(firstPage.value?.items ?? []), ...morePages.value]);
  const total = computed(() => firstPage.value?.total ?? 0);
  const timezone = computed(() => firstPage.value?.timezone ?? "America/Sao_Paulo");
  const hasMore = computed(() => lastPageHasMore.value ?? firstPage.value?.hasMore ?? false);

  async function loadMore() {
    isLoadingMore.value = true;
    try {
      const page = await $fetch("/api/admin/clients", {
        query: { ...query.value, offset: clients.value.length },
      });
      morePages.value.push(...page.items);
      lastPageHasMore.value = page.hasMore;
    } finally {
      isLoadingMore.value = false;
    }
  }

  return { search, clients, total, timezone, hasMore, isLoadingMore, loadMore };
}
