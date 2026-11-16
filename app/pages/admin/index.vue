<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@lucide/vue";

definePageMeta({ layout: "panel" });
useHead({ title: "Agenda" });

const { agenda, title, summary, goToDay, cancelBooking, refresh } = useAgenda();
const isBlocking = ref(false);

async function onBlocked() {
  isBlocking.value = false;
  await refresh();
}
</script>

<template>
  <div>
    <PanelHeader title="Agenda">
      <Button size="md" @click="isBlocking = !isBlocking">
        <PlusIcon aria-hidden="true" />
        Bloquear horário
      </Button>
      <template #bottom>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" aria-label="Dia anterior" @click="goToDay(-1)">
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <div class="flex flex-1 flex-col text-center">
            <span class="text-[15px] font-bold">{{ title }}</span>
            <span class="text-xs text-muted-foreground">{{ summary }}</span>
          </div>
          <Button variant="outline" size="icon-lg" aria-label="Próximo dia" @click="goToDay(1)">
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      </template>
    </PanelHeader>

    <section class="flex flex-col gap-2.5 px-5 py-4">
      <PanelTimeOffForm
        v-if="isBlocking && agenda"
        :date="agenda.date"
        :is-whole-day="false"
        @saved="onBlocked"
        @cancel="isBlocking = false"
      />

      <PanelAgendaEntry
        v-for="(entry, index) in agenda?.items"
        :key="`${entry.kind}-${entry.startMinute}-${index}`"
        :entry="entry"
        @cancel="cancelBooking"
      />
      <p
        v-if="agenda && !agenda.items.length"
        class="py-10 text-center text-sm text-muted-foreground"
      >
        Fechado neste dia.
      </p>
    </section>
  </div>
</template>
