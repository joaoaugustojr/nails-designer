import {
  CANCEL_DEADLINE_OPTIONS,
  GAP_OPTIONS,
  MAX_DAYS_AHEAD_OPTIONS,
  MIN_NOTICE_OPTIONS,
  type RulesChanges,
  type TimeRange,
  WEEKDAYS,
} from "#shared/schemas/schedule";

type NumericRule = "gapMinutes" | "minNoticeMinutes" | "maxDaysAhead";

const NUMERIC_RULES: {
  key: NumericRule;
  label: string;
  options: number[];
  format: (value: number) => string;
}[] = [
  {
    key: "gapMinutes",
    label: "Intervalo entre atendimentos",
    options: GAP_OPTIONS,
    format: (minutes) => (minutes ? `${minutes} min` : "Sem intervalo"),
  },
  {
    key: "minNoticeMinutes",
    label: "Agendar com antecedência mínima",
    options: MIN_NOTICE_OPTIONS,
    format: formatLeadTime,
  },
  {
    key: "maxDaysAhead",
    label: "Agenda aberta até",
    options: MAX_DAYS_AHEAD_OPTIONS,
    format: (days) => `${days} dias`,
  },
];

const CANCEL_DEADLINE_RULE = {
  options: CANCEL_DEADLINE_OPTIONS,
  format: (minutes: number) => `${formatLeadTime(minutes)} antes`,
};

export function useSchedule() {
  const { data: schedule, refresh: refreshSchedule } = useFetch("/api/admin/schedule");
  const { data: timeOffList, refresh: refreshTimeOff } = useFetch("/api/admin/time-off", {
    default: () => [],
  });
  const error = ref("");
  const { confirmAction } = useConfirmDialog();

  const week = computed(() =>
    WEEKDAYS.map((weekday) => ({
      ...weekday,
      ranges: (schedule.value?.workingHours ?? []).filter(
        (range) => range.weekday === weekday.value,
      ),
    })),
  );

  const timezone = useStoreTimezone();

  const timeOffItems = computed(() =>
    timeOffList.value.map((item) => ({
      id: item.id,
      reason: item.reason,
      description: describeTimeOff(
        new Date(item.startsAt).getTime(),
        new Date(item.endsAt).getTime(),
        timezone.value,
      ),
    })),
  );

  async function run(action: () => Promise<void>, refresh: () => Promise<void>) {
    error.value = "";
    try {
      await action();
    } catch {
      error.value = "Não foi possível salvar. Tente novamente.";
    }
    await refresh();
  }

  const saveDay = (weekday: number, ranges: TimeRange[]) =>
    run(async () => {
      await $fetch(`/api/admin/working-hours/${weekday}`, { method: "PUT", body: { ranges } });
    }, refreshSchedule);

  const updateRules = (changes: RulesChanges) =>
    run(async () => {
      await $fetch("/api/admin/rules", { method: "PATCH", body: changes });
    }, refreshSchedule);

  async function removeTimeOff(id: number, description: string) {
    const isRemoved = await confirmAction({
      title: "Remover esta folga?",
      description,
      confirmLabel: "Remover",
      pendingLabel: "Removendo…",
      isDestructive: true,
      action: async () => {
        await $fetch(`/api/admin/time-off/${id}`, { method: "DELETE" });
      },
    });
    if (isRemoved) await refreshTimeOff();
  }

  return {
    rules: computed(() => schedule.value?.rules),
    week,
    timeOffItems,
    error,
    numericRules: NUMERIC_RULES,
    cancelDeadlineRule: CANCEL_DEADLINE_RULE,
    saveDay,
    updateRules,
    removeTimeOff,
    refreshTimeOff,
  };
}
