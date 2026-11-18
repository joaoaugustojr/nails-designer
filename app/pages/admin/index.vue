<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, Share2Icon } from "@lucide/vue";

definePageMeta({ layout: "panel" });
useHead({ title: "Agenda" });

const { agenda, title, summary, lastDate, isLastDate, goToDay, goToDate, cancelBooking, refresh } =
  await useAgenda();
const isBlocking = ref(false);
const route = useRoute();
const bookingPath = computed(() =>
  newBookingPath({ date: agenda.value?.date, from: route.fullPath }),
);

const { data: store } = useStoreInfo();
const siteUrl = useRequestURL().origin;
const shareLink = computed(() =>
  whatsappShareUrl(`Agende seu horário em ${store.value?.name ?? ""}: ${siteUrl}`),
);

async function onBlocked() {
  isBlocking.value = false;
  await refresh();
}
</script>

<template>
  <div>
    <PanelHeader title="Agenda">
      <div class="flex gap-2">
        <Button as-child size="md" variant="outline">
          <a
            :href="shareLink"
            target="_blank"
            rel="noopener"
            aria-label="Compartilhar agenda no WhatsApp"
          >
            <Share2Icon aria-hidden="true" />
          </a>
        </Button>
        <Button size="md" variant="outline" @click="isBlocking = !isBlocking">Bloquear</Button>
        <Button as-child size="md">
          <NuxtLink :to="bookingPath">
            <PlusIcon aria-hidden="true" />
            Agendar
          </NuxtLink>
        </Button>
      </div>
      <template #bottom>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" aria-label="Dia anterior" @click="goToDay(-1)">
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <PanelDayPicker
            v-if="agenda"
            :date="agenda.date"
            :title="title"
            :summary="summary"
            :last-open-date="lastDate"
            :open-weekdays="agenda.openWeekdays"
            :booked-dates="agenda.bookedDates"
            @select="goToDate"
          />
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Próximo dia"
            :disabled="isLastDate"
            @click="goToDay(1)"
          >
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
