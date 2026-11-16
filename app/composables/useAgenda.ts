import type { TimeOffInput } from "#shared/schemas/schedule";

export function useAgenda() {
  const route = useRoute();
  const requestedDate = computed(() =>
    typeof route.query.date === "string" ? route.query.date : undefined,
  );

  const { data: agenda, refresh } = useFetch("/api/admin/agenda", {
    query: computed(() => ({ date: requestedDate.value })),
  });
  const error = ref("");

  const title = computed(() =>
    agenda.value ? formatAgendaDay(agenda.value.date, agenda.value.today) : "",
  );

  const summary = computed(() => {
    if (!agenda.value) return "";
    const { bookingCount, workingRanges } = agenda.value;
    const count = `${bookingCount} ${bookingCount === 1 ? "atendimento" : "atendimentos"}`;
    if (!workingRanges.length) return `${count} · Fechado`;
    const opens = minutesToTime(workingRanges[0]!.startMinute);
    const closes = minutesToTime(workingRanges.at(-1)!.endMinute);
    return `${count} · ${opens} às ${closes}`;
  });

  function goToDay(offset: number) {
    if (!agenda.value) return;
    return navigateTo({ query: { date: addDays(agenda.value.date, offset) } });
  }

  async function run(action: () => Promise<void>) {
    error.value = "";
    try {
      await action();
    } catch {
      error.value = "Não foi possível concluir. Tente novamente.";
    }
    await refresh();
  }

  async function cancelBooking(id: number, clientName: string) {
    if (!confirm(`Cancelar o atendimento de ${clientName}?`)) return;
    await run(async () => {
      await $fetch(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
    });
  }

  const blockTime = (input: TimeOffInput) =>
    run(async () => {
      await $fetch("/api/admin/time-off", { method: "POST", body: input });
    });

  return { agenda, title, summary, error, goToDay, cancelBooking, blockTime };
}
