export function useAgenda() {
  const route = useRoute();
  const requestedDate = computed(() =>
    typeof route.query.date === "string" ? route.query.date : undefined,
  );

  const { data: agenda, refresh } = useFetch("/api/admin/agenda", {
    query: computed(() => ({ date: requestedDate.value })),
  });
  const { confirmAction } = useConfirmDialog();

  const title = computed(() =>
    agenda.value ? formatAgendaDay(agenda.value.date, agenda.value.today) : "",
  );

  const summary = computed(() => {
    if (!agenda.value) return "";
    const { bookingCount, workingRanges } = agenda.value;
    const count = plural(bookingCount, "atendimento", "atendimentos");
    if (!workingRanges.length) return `${count} · Fechado`;
    const opens = minutesToTime(workingRanges[0]!.startMinute);
    const closes = minutesToTime(workingRanges.at(-1)!.endMinute);
    return `${count} · ${opens} às ${closes}`;
  });

  function goToDay(offset: number) {
    if (!agenda.value) return;
    return navigateTo({ query: { date: addDays(agenda.value.date, offset) } });
  }

  async function cancelBooking(id: number, clientName: string) {
    const isCancelled = await confirmAction({
      title: `Cancelar o atendimento de ${clientName}?`,
      description: "O horário volta a ficar livre na agenda.",
      confirmLabel: "Cancelar atendimento",
      pendingLabel: "Cancelando…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
      },
    });
    if (isCancelled) await refresh();
  }

  return { agenda, title, summary, goToDay, cancelBooking, refresh };
}
