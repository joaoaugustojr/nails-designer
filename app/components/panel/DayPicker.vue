<script setup lang="ts">
import { type DateValue, parseDate } from "@internationalized/date";

const props = defineProps<{
  date: string;
  title: string;
  summary: string;
  lastOpenDate: string;
  openWeekdays: number[];
  bookedDates: string[];
}>();
const emit = defineEmits<{ select: [date: string] }>();

const isOpen = ref(false);
const selected = computed(() => parseDate(props.date));
const lastOpen = computed(() => parseDate(props.lastOpenDate));

const isClosed = (day: DateValue) => {
  const date = day.toString();
  return !props.openWeekdays.includes(weekdayOf(date)) && !props.bookedDates.includes(date);
};

function pick(value: DateValue | undefined) {
  if (!value) return;
  isOpen.value = false;
  emit("select", value.toString());
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex min-h-11 flex-1 flex-col items-center justify-center rounded-xl text-center"
        aria-label="Escolher o dia no calendário"
      >
        <span class="text-[15px] font-bold">{{ title }}</span>
        <span class="text-xs text-muted-foreground">{{ summary }}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="center">
      <Calendar
        :model-value="selected"
        :default-placeholder="selected"
        :max-value="lastOpen"
        :is-date-disabled="isClosed"
        locale="pt-BR"
        class="[--cell-size:--spacing(10)]"
        @update:model-value="pick"
      />
    </PopoverContent>
  </Popover>
</template>
