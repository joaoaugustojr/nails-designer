export function usePanelUser() {
  const { user } = useUserSession();
  const isOwner = computed(() => user.value?.role === "owner");
  return { user, isOwner };
}
