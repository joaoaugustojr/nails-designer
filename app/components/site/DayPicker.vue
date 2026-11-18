<script setup lang="ts">
import { type DateValue, parseDate } from "@internationalized/date";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@lucide/vue";

const props = defineProps<{
  days: { date: string; startMinutes: number[] }[];
  firstDate: string;
  lastDate: string;
  openDates: string[];
  canGoBack: boolean;
  canGoForward: boolean;
}>();
const selected = defineModel<string | null>({ required: true });
const emit = defineEmits<{ back: []; forward: []; pick: [date: string] }>();

const isCalendarOpen = ref(false);
const calendarValue = computed(() => (selected.value ? parseDate(selected.value) : undefined));
const isFull = (day: DateValue) => !props.openDates.includes(day.toString());

function pickFromCalendar(value: DateValue | undefined) {
  if (!value) return;
  isCalendarOpen.value = false;
  emit("pick", value.toString());
}

const heading = computed(() => {
  const months = [...new Set(props.days.map((day) => dateParts(day.date).longMonth))];
  return months.join(" – ");
});

const dayButtons = computed(() =>
  props.days.map((day) => {
    const { weekday, day: number } = dateParts(day.date);
    return {
      date: day.date,
      weekday,
      number,
      isClosed: !day.startMinutes.length,
      label: formatDayWithWeekday(day.date),
    };
  }),
);
</script>

<template>
  <section class="flex flex-col gap-2.5">
    <div class="flex items-center justify-between">
      <h2 class="text-[17px] font-bold">{{ heading }}</h2>
      <div class="flex gap-1">
        <Popover v-model:open="isCalendarOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="icon-lg"
              class="relative size-9 bg-card after:absolute after:-inset-1"
              aria-label="Escolher o dia no calendário"
            >
              <CalendarIcon aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="end">
            <Calendar
              :model-value="calendarValue"
              :default-placeholder="calendarValue ?? parseDate(firstDate)"
              :min-value="parseDate(firstDate)"
              :max-value="parseDate(lastDate)"
              :is-date-disabled="isFull"
              locale="pt-BR"
              class="[--cell-size:--spacing(10)]"
              @update:model-value="pickFromCalendar"
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon-lg"
          class="relative size-9 bg-card after:absolute after:-inset-1"
          aria-label="Dias anteriores"
          :disabled="!canGoBack"
          @click="emit('back')"
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-lg"
          class="relative size-9 bg-card after:absolute after:-inset-1"
          aria-label="Próximos dias"
          :disabled="!canGoForward"
          @click="emit('forward')"
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-6 gap-1.5">
      <button
        v-for="day in dayButtons"
        :key="day.date"
        type="button"
        :disabled="day.isClosed"
        :aria-pressed="day.date === selected"
        :aria-label="day.isClosed ? `${day.label}, sem horários` : day.label"
        class="flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border"
        :class="
          day.isClosed
            ? 'border-dashed border-border text-muted-foreground/70'
            : day.date === selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card'
        "
        @click="selected = day.date"
      >
        <span class="text-[11px] font-semibold uppercase opacity-80">{{ day.weekday }}</span>
        <span class="text-lg font-extrabold">{{ day.number }}</span>
      </button>
    </div>
  </section>
</template>
