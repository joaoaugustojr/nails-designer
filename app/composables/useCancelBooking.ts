export function useCancelBooking() {
  const { confirmAction } = useConfirmDialog();

  return function cancelBooking(id: number, clientName: string) {
    return confirmAction({
      title: `Cancelar o atendimento de ${clientName}?`,
      description: "O horário volta a ficar livre na agenda.",
      confirmLabel: "Cancelar atendimento",
      pendingLabel: "Cancelando…",
      isDestructive: true,
      toggle: { label: "Avisar a cliente no WhatsApp", isOn: true },
      action: async (notifyClient) => {
        await $fetch(`/api/admin/bookings/${id}/cancel`, {
          method: "POST",
          body: { notifyClient },
        });
      },
    });
  };
}
