import { refDebounced } from "@vueuse/core";

const SEARCH_DELAY_MS = 300;

export function useClients() {
  const search = ref("");
  const debouncedSearch = refDebounced(search, SEARCH_DELAY_MS);
  const query = computed(() => ({ search: debouncedSearch.value.trim() || undefined }));

  const { data: firstPage, refresh } = useFetch("/api/admin/clients", { query });
  const confirmCancel = useCancelBooking();
  const { confirmAction } = useConfirmDialog();
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

  async function cancelNextBooking(client: Client) {
    if (!client.nextBookingId) return;
    if (await confirmCancel(client.nextBookingId, client.name)) await refresh();
  }

  async function removeClient(client: Client) {
    const isRemoved = await confirmAction({
      title: `Remover ${client.name}?`,
      description:
        "O nome e o telefone dela são apagados. Os atendimentos passados continuam na agenda como “Cliente removida”. Se ela agendar de novo, entra como cliente nova.",
      confirmLabel: "Remover",
      pendingLabel: "Removendo…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
      },
    });
    if (isRemoved) await refresh();
  }

  return {
    search,
    clients,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
    cancelNextBooking,
    removeClient,
  };
}
