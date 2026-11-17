<script setup lang="ts">
import { CalendarPlusIcon, CheckIcon, LinkIcon, NavigationIcon } from "@lucide/vue";
import { useClipboard } from "@vueuse/core";

const props = defineProps<{
  token: string;
  store: { address: string | null; mapLocation: string | null };
}>();

const COPIED_FEEDBACK_MS = 2000;

const directions = computed(() => directionsUrl(props.store));
const { copy, copied } = useClipboard({ copiedDuring: COPIED_FEEDBACK_MS, legacy: true });

function copyLink() {
  return copy(`${window.location.origin}/bookings/${props.token}`);
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2.5">
    <Button as-child variant="outline" class="h-12 rounded-xl bg-card text-sm">
      <a :href="`/api/bookings/${token}/calendar`" download="agendamento.ics">
        <CalendarPlusIcon aria-hidden="true" />
        Salvar na agenda
      </a>
    </Button>
    <Button v-if="directions" as-child variant="outline" class="h-12 rounded-xl bg-card text-sm">
      <a :href="directions" target="_blank" rel="noopener">
        <NavigationIcon aria-hidden="true" />
        Como chegar
      </a>
    </Button>
    <Button
      variant="outline"
      class="col-span-2 h-12 rounded-xl bg-card text-sm"
      aria-live="polite"
      @click="copyLink"
    >
      <CheckIcon v-if="copied" aria-hidden="true" />
      <LinkIcon v-else aria-hidden="true" />
      {{ copied ? "Link copiado" : "Copiar link do agendamento" }}
    </Button>
  </div>
</template>
