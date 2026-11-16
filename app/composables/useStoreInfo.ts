const STORE_INFO_KEY = "store-info";

export function useStoreInfo() {
  return useFetch("/api/store", { key: STORE_INFO_KEY, dedupe: "defer" });
}

export function refreshStoreInfo() {
  return refreshNuxtData(STORE_INFO_KEY);
}

export function useStoreTimezone() {
  const { data } = useStoreInfo();
  return computed(() => data.value?.timezone ?? DEFAULT_TIMEZONE);
}
