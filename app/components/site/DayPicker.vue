<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from "@lucide/vue";

const props = defineProps<{
  days: { date: string; startMinutes: number[] }[];
  canGoBack: boolean;
  canGoForward: boolean;
}>();
const selected = defineModel<string | null>({ required: true });
const emit = defineEmits<{ back: []; forward: [] }>();

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
