export function useAgenda() {
  const route = useRoute();
  const requestedDate = computed(() =>
    typeof route.query.date === "string" ? route.query.date : undefined,
  );

  const { data: agenda, refresh } = useFetch("/api/admin/agenda", {
    query: computed(() => ({ date: requestedDate.value })),
  });
  const confirmCancel = useCancelBooking();

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

  const lastDate = computed(() => {
    if (!agenda.value) return "";
    const { lastOpenDate, bookedDates } = agenda.value;
    const lastBooked = bookedDates.at(-1) ?? "";
    return lastBooked > lastOpenDate ? lastBooked : lastOpenDate;
  });
  const isLastDate = computed(() => !!agenda.value && agenda.value.date >= lastDate.value);

  function goToDay(offset: number) {
    if (!agenda.value) return;
    return navigateTo({ query: { date: addDays(agenda.value.date, offset) } });
  }

  function goToDate(date: string) {
    return navigateTo({ query: { date } });
  }

  async function cancelBooking(id: number, clientName: string) {
    if (await confirmCancel(id, clientName)) await refresh();
  }

  return {
    agenda,
    title,
    summary,
    lastDate,
    isLastDate,
    goToDay,
    goToDate,
    cancelBooking,
    refresh,
  };
}
