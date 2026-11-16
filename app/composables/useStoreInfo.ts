export const STORE_INFO_KEY = "store-info";

export function useStoreInfo() {
  return useFetch("/api/store", { key: STORE_INFO_KEY, dedupe: "defer" });
}

export function refreshStoreInfo() {
  return refreshNuxtData(STORE_INFO_KEY);
}
