import { type DateValue, parseDate } from "@internationalized/date";

import {
  WAITLIST_MAX_DAYS,
  WAITLIST_NOTE_MAX_LENGTH,
  type WaitlistPeriod,
  waitlistSchema,
} from "#shared/schemas/waitlist";

type FieldName = "name" | "phone" | "dates" | "periods" | "note";

const FIELD_ERRORS: Record<FieldName, string> = {
  name: CLIENT_NAME_ERROR,
  phone: PHONE_ERROR,
  dates: "Escolha pelo menos um dia.",
  periods: "Escolha pelo menos um período.",
  note: `A observação pode ter até ${WAITLIST_NOTE_MAX_LENGTH} caracteres.`,
};

const REQUEST_ERRORS: Record<number, string> = {
  403: "A lista de espera não está disponível no momento.",
  429: TOO_MANY_ATTEMPTS_ERROR,
};

export function useWaitlistForm(serviceId: number) {
  const form = reactive({
    name: "",
    phone: "",
    dates: [] as string[],
    periods: [] as WaitlistPeriod[],
    note: "",
    website: "",
  });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const error = ref("");
  const isSaving = ref(false);
  const isSent = ref(false);

  const calendarDates = computed(() => form.dates.map((date) => parseDate(date)));

  function selectDates(dates: DateValue[] | DateValue | undefined) {
    const list = Array.isArray(dates) ? dates : dates ? [dates] : [];
    if (list.length <= WAITLIST_MAX_DAYS) form.dates = list.map((date) => date.toString());
  }

  function togglePeriod(period: WaitlistPeriod) {
    form.periods = form.periods.includes(period)
      ? form.periods.filter((chosen) => chosen !== period)
      : [...form.periods, period];
  }

  function formatPhoneField() {
    form.phone = formatPhone(form.phone);
  }

  function reset() {
    Object.assign(form, { dates: [], periods: [], note: "" });
    errors.value = {};
    error.value = "";
    isSent.value = false;
  }

  async function send() {
    const parsed = waitlistSchema.safeParse({ ...form, serviceId });
    errors.value = parsed.success ? {} : fieldMessages(parsed.error, FIELD_ERRORS);
    if (!parsed.success) return;

    error.value = "";
    isSaving.value = true;
    try {
      await $fetch("/api/waitlist", { method: "POST", body: parsed.data });
      isSent.value = true;
    } catch (failure) {
      error.value =
        REQUEST_ERRORS[errorStatus(failure) ?? 0] ?? "Não foi possível enviar. Tente de novo.";
    } finally {
      isSaving.value = false;
    }
  }

  return {
    form,
    errors,
    error,
    isSaving,
    isSent,
    calendarDates,
    selectDates,
    togglePeriod,
    formatPhoneField,
    reset,
    send,
  };
}
