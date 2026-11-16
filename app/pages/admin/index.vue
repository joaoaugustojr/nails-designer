<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@lucide/vue";

import type { TimeOffInput } from "#shared/schemas/schedule";

definePageMeta({ layout: "panel" });
useHead({ title: "Agenda" });

const { agenda, title, summary, error, goToDay, cancelBooking, blockTime } = useAgenda();
const isBlocking = ref(false);

async function saveBlock(input: TimeOffInput) {
  await blockTime(input);
  isBlocking.value = false;
}
</script>

<template>
  <div>
    <header class="flex flex-col gap-3.5 border-b border-border bg-card px-5 pt-5 pb-3">
      <div class="flex items-center justify-between">
        <h1 class="text-[22px] font-extrabold">Agenda</h1>
        <Button size="md" @click="isBlocking = !isBlocking">
          <PlusIcon aria-hidden="true" />
          Bloquear horário
        </Button>
      </div>
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
    </header>

    <section class="flex flex-col gap-2.5 px-5 py-4">
      <PanelTimeOffForm
        v-if="isBlocking && agenda"
        :date="agenda.date"
        :is-whole-day="false"
        @save="saveBlock"
        @cancel="isBlocking = false"
      />
      <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>

      <PanelAgendaEntry
        v-for="entry in agenda?.items"
        :key="`${entry.kind}-${entry.startMinute}`"
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
