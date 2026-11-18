<script setup lang="ts">
import { MessageCircleIcon } from "@lucide/vue";

const route = useRoute("bookings-token");
const token = route.params.token;

const { data, refresh } = await useFetch(`/api/bookings/${token}`);
if (!data.value)
  throw createError({ statusCode: 404, statusMessage: "Agendamento não encontrado" });
useHead({ title: "Seu agendamento" });

const { confirmAction } = useConfirmDialog();

const store = computed(() => data.value!.store);
const booking = computed(() => data.value!.booking);
const cancellation = computed(() => data.value!.cancellation);
const isCancelled = computed(() => booking.value.status === "cancelled");

const bookedService = computed(() => ({
  name: booking.value.serviceName,
  durationMinutes: booking.value.serviceDurationMinutes,
  priceCents: booking.value.servicePriceCents,
}));

const when = computed(() =>
  formatBookingTime(booking.value.date, booking.value.startMinute, booking.value.endMinute),
);

const greeting = computed(() =>
  booking.value.hasStarted
    ? `Olá, ${booking.value.clientFirstName}! Esperamos que tenha gostado.`
    : `Olá, ${booking.value.clientFirstName}! Está tudo certo, te esperamos.`,
);

const contactNote = computed(() =>
  cancellation.value.isOffered
    ? "O prazo para cancelar por aqui já passou. Para remarcar ou desmarcar, entre em contato pelo WhatsApp."
    : `Precisa remarcar ou desmarcar? Entre em contato pelo WhatsApp, que resolvemos para você.`,
);

const whatsappLink = computed(() => {
  if (!store.value.whatsapp) return null;
  const message = `Olá! Sobre meu agendamento de ${booking.value.serviceName} em ${formatDayWithWeekday(booking.value.date)} às ${minutesToTime(booking.value.startMinute)}.`;
  return whatsappUrl(store.value.whatsapp, message);
});

function cancelBooking() {
  return confirmAction({
    title: "Cancelar este agendamento?",
    description: `${booking.value.serviceName} · ${when.value}`,
    confirmLabel: "Cancelar agendamento",
    dismissLabel: "Manter",
    pendingLabel: "Cancelando…",
    isDestructive: true,
    action: async () => {
      await $fetch(`/api/bookings/${token}/cancel`, { method: "POST" });
      await refresh();
    },
  });
}
</script>

<template>
  <main v-if="data" class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-14 pb-[22px]">
    <div
      v-if="isCancelled"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <h1 class="text-[22px] font-extrabold">Agendamento cancelado</h1>
      <p class="max-w-[280px] text-[15px] leading-normal text-muted-foreground">
        O horário foi liberado. Esperamos ver você em breve!
      </p>
      <Button as-child variant="link" size="inline" class="mt-2 text-[15px]">
        <NuxtLink to="/">Agendar outro horário</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <div class="flex flex-col gap-2">
        <span class="text-[13px] font-bold text-primary">{{ store.name }}</span>
        <h1 class="text-2xl font-extrabold tracking-tight">Seu agendamento</h1>
        <p class="text-[15px] leading-normal text-muted-foreground">{{ greeting }}</p>
      </div>

      <SurfaceCard class="mt-6 flex flex-col gap-1.5 rounded-2xl p-4 text-sm text-foreground/80">
        <span class="text-base font-bold text-foreground">{{ booking.serviceName }}</span>
        <span>{{ when }}</span>
        <span v-if="store.address">{{ store.address }}</span>
        <SiteServiceDetailsLink
          :service-id="booking.serviceId"
          :booked="bookedService"
          class="self-start"
        />
      </SurfaceCard>

      <SiteBookingLinks
        v-if="!booking.hasStarted"
        :token="booking.token"
        :store="store"
        class="mt-3.5"
      />

      <template v-if="booking.hasStarted">
        <div class="mt-auto flex flex-col pt-6">
          <Button as-child>
            <NuxtLink to="/">Agendar outro horário</NuxtLink>
          </Button>
        </div>
      </template>

      <template v-else-if="cancellation.canCancelNow">
        <p
          class="mt-3.5 rounded-xl bg-(--warning) px-3.5 py-3 text-[13px] leading-[1.45] text-(--warning-foreground)"
        >
          Você pode cancelar por aqui até
          {{ formatLeadTime(cancellation.deadlineMinutes) }} antes. Depois disso, entre em contato
          pelo WhatsApp.
        </p>
        <div class="mt-auto flex flex-col gap-2.5 pt-6">
          <Button v-if="whatsappLink" as-child>
            <a :href="whatsappLink" target="_blank" rel="noopener">Falar comigo no WhatsApp</a>
          </Button>
          <Button
            variant="outline"
            class="border-[1.5px] border-destructive bg-card text-destructive hover:bg-destructive/10 hover:text-destructive"
            @click="cancelBooking"
          >
            Cancelar agendamento
          </Button>
        </div>
      </template>

      <template v-else>
        <SurfaceCard
          class="mt-3.5 flex gap-2.5 rounded-xl p-3.5 text-sm leading-[1.45] text-foreground/80"
        >
          <MessageCircleIcon class="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>{{ contactNote }}</span>
        </SurfaceCard>
        <div v-if="whatsappLink" class="mt-auto flex flex-col pt-6">
          <Button as-child>
            <a :href="whatsappLink" target="_blank" rel="noopener">
              <MessageCircleIcon aria-hidden="true" />
              Falar comigo no WhatsApp
            </a>
          </Button>
        </div>
      </template>
    </template>
  </main>
</template>
