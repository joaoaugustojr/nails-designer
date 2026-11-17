<script setup lang="ts">
import { CalendarPlusIcon, NavigationIcon } from "@lucide/vue";

const props = defineProps<{
  token: string;
  store: { address: string | null; mapLocation: string | null };
}>();

const directions = computed(() => directionsUrl(props.store));
</script>

<template>
  <div class="grid auto-cols-fr grid-flow-col gap-2.5">
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
  </div>
</template>
