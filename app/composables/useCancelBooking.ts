export function useCancelBooking() {
  const { confirmAction } = useConfirmDialog();
  const { isWhatsappEnabled } = useRuntimeConfig().public;

  return function cancelBooking(id: number, clientName: string) {
    return confirmAction({
      title: `Cancelar o atendimento de ${clientName}?`,
      description: "O horário volta a ficar livre na agenda.",
      confirmLabel: "Cancelar atendimento",
      pendingLabel: "Cancelando…",
      isDestructive: true,
      toggle: isWhatsappEnabled ? { label: "Avisar a cliente no WhatsApp", isOn: true } : undefined,
      action: async (isToggleOn) => {
        await $fetch(`/api/admin/bookings/${id}/cancel`, {
          method: "POST",
          body: { notifyClient: isWhatsappEnabled && isToggleOn },
        });
      },
    });
  };
}
