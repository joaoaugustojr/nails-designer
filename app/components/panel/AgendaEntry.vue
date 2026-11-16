<script setup lang="ts">
type Booking = { id: number; clientName: string; clientPhone: string; serviceName: string };
type Block = { id: number; reason: string | null };
type Entry = TimelineItem<DaySpan & Booking, DaySpan & Block>;

const props = defineProps<{ entry: Entry }>();
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

    <div
      v-if="entry.kind === 'booking'"
      class="flex flex-1 flex-col gap-1 rounded-xl border border-border bg-card px-3.5 py-3"
    >
      <span class="text-[15px] font-bold">{{ entry.clientName }}</span>
      <span class="text-[13px] text-muted-foreground">{{ entry.serviceName }}</span>
      <div class="mt-1 flex gap-4">
        <a
          :href="whatsappUrl(entry.clientPhone)"
          target="_blank"
          rel="noopener"
          class="flex h-9 items-center text-[13px] font-bold text-primary"
        >
          WhatsApp
        </a>
        <button
          type="button"
          class="h-9 text-[13px] font-bold text-muted-foreground"
          @click="emit('cancel', entry.id, entry.clientName)"
        >
          Cancelar
        </button>
      </div>
    </div>

    <div
      v-else
      class="mt-0.5 flex-1 rounded-xl border border-dashed border-input px-3.5 py-2.5 text-[13px] text-muted-foreground"
    >
      {{ placeholder }}
    </div>
  </div>
</template>
