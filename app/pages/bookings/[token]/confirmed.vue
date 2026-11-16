<script setup lang="ts">
import { CalendarPlusIcon, CheckIcon, NavigationIcon } from "@lucide/vue";

const route = useRoute("bookings-token-confirmed");
const token = route.params.token;

const { data } = await useFetch(`/api/bookings/${token}`);
if (!data.value)
  throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
useHead({ title: "Agendamento confirmado" });

const store = computed(() => data.value!.store);
const booking = computed(() => data.value!.booking);
const when = computed(
  () => `${formatDayWithWeekday(booking.value.date)} · ${minutesToTime(booking.value.startMinute)}`,
);
const directionsUrl = computed(() =>
  store.value.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.value.address)}`
    : null,
);
</script>

<template>
  <main
    v-if="data"
    class="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-[18px] px-5 pt-9 pb-[22px]"
  >
    <div class="flex flex-col items-center gap-2.5 text-center">
      <div
        class="flex size-16 items-center justify-center rounded-full bg-(--success)/15 text-(--success)"
      >
        <CheckIcon class="size-8" :stroke-width="2.4" aria-hidden="true" />
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight">
        Obrigada, {{ booking.clientFirstName }}!
      </h1>
      <p class="text-[15px] leading-normal text-muted-foreground">Seu horário está reservado.</p>
    </div>

    <figure
      v-if="store.thankYouMessage"
      class="flex flex-col gap-3 rounded-2xl bg-secondary p-[18px]"
    >
      <blockquote
        class="font-[Georgia,serif] text-xl leading-[1.35] text-secondary-foreground italic"
      >
        “{{ store.thankYouMessage }}”
      </blockquote>
      <figcaption class="flex items-center gap-2.5">
        <StoreMark :name="store.name" :logo-path="store.logoPath" size="xs" class="bg-card" />
        <span class="text-sm font-bold">{{ store.name }}</span>
      </figcaption>
    </figure>

    <SurfaceCard as="dl" class="flex flex-col divide-y divide-border rounded-2xl">
      <div class="flex justify-between gap-3 px-4 py-3.5 text-sm">
        <dt class="text-muted-foreground">Serviço</dt>
        <dd class="text-right font-bold">{{ booking.serviceName }}</dd>
      </div>
      <div class="flex justify-between gap-3 px-4 py-3.5 text-sm">
        <dt class="text-muted-foreground">Quando</dt>
        <dd class="text-right font-bold">{{ when }}</dd>
      </div>
      <div v-if="store.address" class="flex justify-between gap-3 px-4 py-3.5 text-sm">
        <dt class="text-muted-foreground">Onde</dt>
        <dd class="text-right font-bold">{{ store.address }}</dd>
      </div>
    </SurfaceCard>

    <div class="grid auto-cols-fr grid-flow-col gap-2.5">
      <Button as-child variant="outline" class="h-12 rounded-xl bg-card text-sm">
        <a :href="`/api/bookings/${token}/calendar`" download="agendamento.ics">
          <CalendarPlusIcon aria-hidden="true" />
          Salvar na agenda
        </a>
      </Button>
      <Button
        v-if="directionsUrl"
        as-child
        variant="outline"
        class="h-12 rounded-xl bg-card text-sm"
      >
        <a :href="directionsUrl" target="_blank" rel="noopener">
          <NavigationIcon aria-hidden="true" />
          Como chegar
        </a>
      </Button>
    </div>

    <Button as-child variant="link" size="inline" class="self-center text-sm">
      <NuxtLink :to="`/bookings/${token}`">Ver meu agendamento</NuxtLink>
    </Button>

    <div class="mt-auto flex flex-col items-center gap-2.5">
      <template v-if="store.instagram">
        <span class="text-center text-[13px] text-muted-foreground">
          Acompanhe os trabalhos e as novidades
        </span>
        <Button as-child class="w-full">
          <a :href="`https://instagram.com/${store.instagram}`" target="_blank" rel="noopener">
            <SiteInstagramIcon class="size-5" aria-hidden="true" />
            Seguir no Instagram
          </a>
        </Button>
      </template>
      <Button as-child variant="link" size="inline" class="text-sm">
        <NuxtLink to="/">Voltar ao início</NuxtLink>
      </Button>
    </div>
  </main>
</template>
