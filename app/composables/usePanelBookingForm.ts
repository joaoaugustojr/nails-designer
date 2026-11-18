import { refDebounced } from "@vueuse/core";

import { panelBookingSchema } from "#shared/schemas/booking";

import type { ApiGet } from "~/types/api";

type FieldName = "name" | "phone" | "date" | "startMinute" | "priceCents";

const FIELD_ERRORS: Record<FieldName, string> = {
  name: "Informe o nome da cliente.",
  phone: "Informe o celular com DDD, por exemplo (11) 91234-5678.",
  date: "Escolha o dia.",
  startMinute: "Escolha o horário.",
  priceCents: "Informe um preço válido, por exemplo 45,00.",
};

const SEARCH_DELAY_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const MAX_SUGGESTIONS = 3;

type ClientMatch = ApiGet<"/api/admin/clients">["items"][number];
type Conflict = { clientName: string; date: string; startMinute: number; endMinute: number };

export function usePanelBookingForm(initialDate: string) {
  const { data: services } = useFetch("/api/admin/services");

  const form = reactive({
    serviceId: 0,
    date: initialDate,
    time: "",
    price: "",
    name: "",
    phone: "",
    remindersOptIn: false,
  });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const conflict = ref<Conflict | null>(null);
  const formError = ref("");
  const isSaving = ref(false);

  const service = computed(() => services.value?.find((item) => item.id === form.serviceId));
  const serviceIds = computed(() => services.value?.map((item) => item.id) ?? []);
  const serviceName = (id: number) => services.value?.find((item) => item.id === id)?.name ?? "";

  watch(
    services,
    (list) => {
      if (!form.serviceId && list?.[0]) form.serviceId = list[0].id;
    },
    { immediate: true },
  );
  watch(
    service,
    (chosen) => {
      if (chosen) form.price = centsToPriceInput(chosen.priceCents);
    },
    { immediate: true },
  );

  const endTime = computed(() => {
    const start = timeToMinutes(form.time);
    if (start === null || !service.value) return "";
    return minutesToTime((start + service.value.durationMinutes) % MINUTES_PER_DAY);
  });

  const search = refDebounced(toRef(form, "name"), SEARCH_DELAY_MS);
  const matches = ref<ClientMatch[]>([]);
  watch(search, async (term) => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      matches.value = [];
      return;
    }
    const page = await $fetch("/api/admin/clients", { query: { search: trimmed } });
    matches.value = page.items;
  });
  const suggestions = computed(() =>
    matches.value
      .filter(
        (client) => client.name !== form.name || client.phone !== form.phone.replace(/\D/g, ""),
      )
      .slice(0, MAX_SUGGESTIONS),
  );

  function chooseClient(client: { name: string; phone: string }) {
    form.name = client.name;
    form.phone = formatPhone(client.phone);
  }

  function formatPhoneField() {
    form.phone = formatPhone(form.phone.replace(/\D/g, ""));
  }

  async function save() {
    const parsed = panelBookingSchema.safeParse({
      serviceId: form.serviceId,
      date: form.date,
      startMinute: timeToMinutes(form.time) ?? Number.NaN,
      priceCents: parsePrice(form.price) ?? Number.NaN,
      name: form.name,
      phone: form.phone,
      remindersOptIn: form.remindersOptIn,
    });
    errors.value = parsed.success ? {} : fieldMessages(parsed.error, FIELD_ERRORS);
    if (!parsed.success) return;

    conflict.value = null;
    formError.value = "";
    isSaving.value = true;
    try {
      await $fetch("/api/admin/bookings", { method: "POST", body: parsed.data });
      await navigateTo({ path: "/admin", query: { date: parsed.data.date } });
    } catch (failure) {
      const details = (failure as { data?: { data?: Conflict } }).data?.data;
      if (errorStatus(failure) === 409 && details) {
        conflict.value = details;
        return;
      }
      formError.value =
        errorStatus(failure) === 409
          ? "Esse horário acabou de ser ocupado. Escolha outro."
          : "Não foi possível agendar. Tente de novo.";
    } finally {
      isSaving.value = false;
    }
  }

  return {
    form,
    errors,
    conflict,
    formError,
    isSaving,
    serviceIds,
    serviceName,
    endTime,
    suggestions,
    chooseClient,
    formatPhoneField,
    save,
  };
}
