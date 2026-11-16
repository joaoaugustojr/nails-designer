<script setup lang="ts">
import { CalendarIcon } from "@lucide/vue";

type Client = {
  name: string;
  phone: string;
  visits: number;
  spentCents: number;
  lastVisitAt: number | null;
  nextVisitAt: number | null;
  cancellations: number;
};

const props = defineProps<{ client: Client; timezone: string }>();

const initials = computed(() =>
  props.client.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join(""),
);

const isNew = computed(() => props.client.visits === 0);

const metrics = computed(() => [
  {
    value: String(props.client.visits),
    label: props.client.visits === 1 ? "atendimento" : "atendimentos",
  },
  { value: formatPriceShort(props.client.spentCents), label: "total gasto" },
  {
    value: props.client.lastVisitAt
      ? formatDay(utcToZoned(props.client.lastVisitAt, props.timezone).date)
      : "—",
    label: "último",
  },
]);

const nextVisit = computed(() => {
  if (!props.client.nextVisitAt) return null;
  const { date, minutes } = utcToZoned(props.client.nextVisitAt, props.timezone);
  return `${formatDayWithWeekday(date)} · ${minutesToTime(minutes)}`;
});

const cancellations = computed(() => {
  const count = props.client.cancellations;
  if (!count) return null;
  return count === 1 ? "1 cancelamento" : `${count} cancelamentos`;
});
</script>

<template>
  <article class="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5">
    <div class="flex items-center gap-3">
      <div
        aria-hidden="true"
        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-[15px] font-extrabold text-primary"
      >
        {{ initials }}
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 class="flex items-center gap-2 text-[15px] font-bold">
          <span class="truncate">{{ client.name }}</span>
          <Badge v-if="isNew" variant="secondary">Nova</Badge>
        </h2>
        <span class="text-[13px] text-muted-foreground">{{ formatPhone(client.phone) }}</span>
      </div>
      <a
        :href="whatsappUrl(client.phone)"
        target="_blank"
        rel="noopener"
        :aria-label="`Conversar com ${client.name} no WhatsApp`"
        class="flex h-11 shrink-0 items-center text-[13px] font-bold text-primary"
      >
        WhatsApp
      </a>
    </div>

    <dl class="grid grid-cols-3 gap-2">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="flex flex-col-reverse gap-px rounded-[10px] bg-background px-2.5 py-2"
      >
        <dt class="text-[11px] text-muted-foreground">{{ metric.label }}</dt>
        <dd class="text-base font-extrabold">{{ metric.value }}</dd>
      </div>
    </dl>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <span
        v-if="nextVisit"
        class="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1.5 text-xs font-bold text-secondary-foreground"
      >
        <CalendarIcon :size="14" aria-hidden="true" />
        Próximo: {{ nextVisit }}
      </span>
      <span v-else class="text-xs text-muted-foreground">Sem agendamento futuro</span>
      <span v-if="cancellations" class="text-xs text-muted-foreground">{{ cancellations }}</span>
    </div>
  </article>
</template>
