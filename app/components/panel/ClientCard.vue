<script setup lang="ts">
import { CalendarIcon } from "@lucide/vue";

import type { ApiGet } from "~/types/api";

const props = defineProps<{ client: ApiGet<"/api/admin/clients">["items"][number] }>();

const timezone = useStoreTimezone();

const isNew = computed(() => props.client.visits === 0);

const metrics = computed(() => [
  {
    value: String(props.client.visits),
    label: props.client.visits === 1 ? "atendimento" : "atendimentos",
  },
  { value: formatPriceShort(props.client.spentCents), label: "total gasto" },
  {
    value: props.client.lastVisitAt
      ? formatDay(utcToZoned(props.client.lastVisitAt, timezone.value).date)
      : "—",
    label: "último",
  },
]);

const nextVisit = computed(() => {
  if (!props.client.nextVisitAt) return null;
  const { date, minutes } = utcToZoned(props.client.nextVisitAt, timezone.value);
  return `${formatDayWithWeekday(date)} · ${minutesToTime(minutes)}`;
});

const cancellations = computed(() =>
  props.client.cancellations
    ? plural(props.client.cancellations, "cancelamento", "cancelamentos")
    : null,
);
</script>

<template>
  <SurfaceCard as="article" class="flex flex-col gap-3 p-3.5">
    <div class="flex items-center gap-3">
      <div
        aria-hidden="true"
        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-[15px] font-extrabold text-primary"
      >
        {{ initials(client.name) }}
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 class="flex items-center gap-2 text-[15px] font-bold">
          <span class="truncate">{{ client.name }}</span>
          <Badge v-if="isNew" variant="secondary">Nova</Badge>
        </h2>
        <span class="text-[13px] text-muted-foreground">{{ formatPhone(client.phone) }}</span>
      </div>
      <Button as-child variant="link" size="inline" class="shrink-0">
        <a
          :href="whatsappUrl(client.phone)"
          target="_blank"
          rel="noopener"
          :aria-label="`Conversar com ${client.name} no WhatsApp`"
        >
          WhatsApp
        </a>
      </Button>
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
  </SurfaceCard>
</template>
