<script setup lang="ts">
const DAYS_PER_PAGE = 6;

const route = useRoute("book-serviceId");
const queryText = (value: unknown) => (typeof value === "string" ? value : undefined);

const from = ref(queryText(route.query.date));
const selectedDate = ref<string | null>(queryText(route.query.date) ?? null);
const selectedStart = ref<number | null>(Number(route.query.start) || null);

const { data, status } = await useFetch(`/api/services/${route.params.serviceId}/availability`, {
  query: { from, days: DAYS_PER_PAGE },
});
if (!data.value) throw createError({ statusCode: 404, statusMessage: "Serviço não encontrado" });

useHead({ title: "Escolha o horário" });

const { data: store } = useStoreInfo();
const isWaitlistOpen = ref(false);

const days = computed(() => data.value?.days ?? []);
const selectedDay = computed(() => days.value.find((day) => day.date === selectedDate.value));
const pageStart = computed(() => days.value[0]?.date ?? "");
const canGoBack = computed(() => !!data.value && pageStart.value > data.value.firstDate);
const canGoForward = computed(
  () => !!data.value && addDays(pageStart.value, DAYS_PER_PAGE) <= data.value.lastDate,
);

watch(
  days,
  (list) => {
    if (list.some((day) => day.date === selectedDate.value && day.startMinutes.length)) return;
    selectedDate.value = list.find((day) => day.startMinutes.length)?.date ?? null;
  },
  { immediate: true },
);

watch(selectedDate, (date, previous) => {
  if (previous !== undefined && date !== previous) selectedStart.value = null;
});

const summary = computed(() => {
  if (!selectedDate.value || selectedStart.value === null || !data.value) {
    return "Escolha um horário";
  }
  const end = selectedStart.value + data.value.service.durationMinutes;
  return `${formatDayWithWeekday(selectedDate.value)} às ${minutesToTime(selectedStart.value)} · termina ${minutesToTime(end)}`;
});

const nextStep = computed(() =>
  selectedDate.value && selectedStart.value !== null
    ? `/book/${route.params.serviceId}/details?date=${selectedDate.value}&start=${selectedStart.value}`
    : null,
);

function movePage(direction: 1 | -1) {
  from.value = addDays(pageStart.value, direction * DAYS_PER_PAGE);
}

function pickDate(date: string) {
  from.value = date;
  selectedDate.value = date;
}
</script>

<template>
  <main v-if="data" class="flex min-h-dvh w-full flex-col">
    <SiteStepHeader title="Escolha o horário" step="Passo 1 de 2" back-to="/" />

    <div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-6">
      <SiteChosenService :service="data.service" />

      <SiteDayPicker
        v-model="selectedDate"
        :days="days"
        :first-date="data.firstDate"
        :last-date="data.lastDate"
        :open-dates="data.openDates"
        :can-go-back="canGoBack"
        :can-go-forward="canGoForward"
        :class="{ 'opacity-60': status === 'pending' }"
        @back="movePage(-1)"
        @forward="movePage(1)"
        @pick="pickDate"
      />

      <section class="flex flex-col gap-2.5">
        <div class="flex items-baseline justify-between">
          <h2 class="text-[17px] font-bold">Horários livres</h2>
          <span v-if="selectedDate" class="text-[13px] text-muted-foreground">
            {{ formatDayWithWeekday(selectedDate) }}
          </span>
        </div>
        <SiteSlotPicker
          v-if="selectedDay"
          v-model="selectedStart"
          :start-minutes="selectedDay.startMinutes"
        />
        <p v-else class="text-sm text-muted-foreground">
          Nenhum horário livre nestes dias. Veja os próximos.
        </p>
        <p class="text-xs leading-[1.45] text-muted-foreground">
          Mostramos só os horários em que o serviço inteiro cabe na agenda.
        </p>
        <Button
          v-if="store?.isWaitlistEnabled"
          variant="link"
          size="inline"
          class="h-auto min-h-11 self-start text-left whitespace-normal"
          @click="isWaitlistOpen = true"
        >
          Nenhum horário bom? Deixe seu WhatsApp e te chamamos quando abrir uma vaga
        </Button>
      </section>

      <SiteWaitlistSheet
        v-if="store?.isWaitlistEnabled"
        v-model:open="isWaitlistOpen"
        :service="data.service"
        :first-date="data.firstDate"
        :last-date="data.lastDate"
        :open-weekdays="data.openWeekdays"
      />
    </div>

    <footer
      class="sticky bottom-0 mt-auto border-t border-border bg-card pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))] [@media(max-height:500px)]:static"
    >
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-5">
        <span class="text-center text-[13px] text-muted-foreground">{{ summary }}</span>
        <Button v-if="nextStep" as-child>
          <NuxtLink :to="nextStep">Continuar</NuxtLink>
        </Button>
        <Button v-else disabled>Continuar</Button>
      </div>
    </footer>
  </main>
</template>
