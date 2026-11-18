<script setup lang="ts">
import type { ApiGet } from "~/types/api";

const props = defineProps<{ entry: ApiGet<"/api/admin/agenda">["items"][number] }>();
const emit = defineEmits<{ cancel: [id: number, clientName: string] }>();

const start = computed(() => minutesToTime(props.entry.startMinute));
const end = computed(() => minutesToTime(props.entry.endMinute));

const placeholder = computed(() => {
  const { entry } = props;
  if (entry.kind === "free") return `Livre até ${end.value}`;
  if (entry.kind === "break") return `Intervalo até ${end.value}`;
  if (entry.kind === "blocked") return `${entry.reason || "Horário"} · bloqueado até ${end.value}`;
  return "";
});
</script>

<template>
  <div class="flex gap-3">
    <div class="flex w-12 shrink-0 flex-col pt-3 text-[13px]">
      <span :class="entry.kind === 'booking' ? 'font-bold' : 'font-semibold text-muted-foreground'">
        {{ start }}
      </span>
      <span v-if="entry.kind === 'booking'" class="text-muted-foreground">{{ end }}</span>
    </div>

    <SurfaceCard
      v-if="entry.kind === 'booking'"
      class="flex flex-1 flex-col gap-1 px-3.5 pt-3 pb-1"
    >
      <span class="text-[15px] font-bold">{{ entry.clientName }}</span>
      <span class="text-[13px] text-muted-foreground">
        {{ entry.serviceName }} · {{ formatPriceShort(entry.servicePriceCents) }}
      </span>
      <div class="flex gap-4">
        <Button v-if="entry.clientPhone" as-child variant="link" size="inline">
          <a :href="whatsappUrl(entry.clientPhone)" target="_blank" rel="noopener">WhatsApp</a>
        </Button>
        <Button variant="quiet" size="inline" @click="emit('cancel', entry.id, entry.clientName)">
          Cancelar
        </Button>
      </div>
    </SurfaceCard>

    <div
      v-else
      class="mt-0.5 flex-1 rounded-xl border border-dashed border-input px-3.5 py-2.5 text-[13px] text-muted-foreground"
    >
      {{ placeholder }}
    </div>
  </div>
</template>
