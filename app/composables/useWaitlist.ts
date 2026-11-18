export async function useWaitlist() {
  const waitlistRequest = useFetch("/api/admin/waitlist", { default: () => [] });
  const { data: requests, refresh } = waitlistRequest;
  const { confirmAction } = useConfirmDialog();

  async function resolve(request: { id: number; clientName: string }) {
    const isRemoved = await confirmAction({
      title: "Tirar da lista de espera?",
      description: `O pedido de ${request.clientName} sai da lista.`,
      confirmLabel: "Tirar da lista",
      pendingLabel: "Tirando…",
      action: async () => {
        await $fetch(`/api/admin/waitlist/${request.id}`, { method: "DELETE" });
      },
    });
    if (isRemoved) await refresh();
  }

  await waitlistRequest;

  return { requests, resolve };
}
