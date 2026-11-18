<script setup lang="ts">
import { NAME_MAX_LENGTH } from "#shared/schemas/fields";

const route = useRoute("book-serviceId-details");
const date = String(route.query.date ?? "");
const startMinute = Number(route.query.start);
const serviceId = Number(route.params.serviceId);
const backTo = `/book/${serviceId}?date=${date}&start=${startMinute}`;

const { data } = await useFetch(`/api/services/${serviceId}/availability`, {
  query: { from: date, days: 1 },
});
if (!data.value) throw createError({ statusCode: 404, statusMessage: "Serviço não encontrado" });
useHead({ title: "Seus dados" });

const isStillFree = computed(
  () => data.value?.days[0]?.date === date && data.value.days[0].startMinutes.includes(startMinute),
);

const { form, errors, error, isSlotTaken, isSaving, formatPhoneField, confirm } = useBookingForm({
  serviceId,
  date,
  startMinute,
});

const { isWhatsappEnabled } = useRuntimeConfig().public;
const cancelHint = isWhatsappEnabled
  ? "Imprevisto? A mensagem de confirmação explica como desmarcar."
  : "Imprevisto? Depois de confirmar, você vê como desmarcar.";

const when = computed(() => {
  if (!data.value) return "";
  const end = startMinute + data.value.service.durationMinutes;
  return `${formatDayWithWeekday(date)} · ${minutesToTime(startMinute)} às ${minutesToTime(end)} · ${formatPriceShort(data.value.service.priceCents)}`;
});
</script>

<template>
  <form v-if="data" class="flex min-h-dvh w-full flex-col" novalidate @submit.prevent="confirm">
    <SiteStepHeader title="Seus dados" step="Passo 2 de 2" :back-to="backTo" />

    <div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-6">
      <SiteChosenService :service="data.service">
        <span class="text-[13px] text-muted-foreground">{{ when }}</span>
      </SiteChosenService>

      <div
        v-if="!isStillFree || isSlotTaken"
        role="alert"
        class="flex flex-col items-start gap-1 text-sm text-destructive"
      >
        {{ isSlotTaken ? error : "Esse horário não está mais livre. Escolha outro." }}
        <Button as-child variant="link" size="inline">
          <NuxtLink :to="`/book/${serviceId}?date=${date}`">Escolher outro horário</NuxtLink>
        </Button>
      </div>

      <FieldGroup>
        <Field :data-invalid="!!errors.name || undefined">
          <FieldLabel for="booking-name">Nome</FieldLabel>
          <Input
            id="booking-name"
            v-model="form.name"
            :maxlength="NAME_MAX_LENGTH"
            autocomplete="name"
            placeholder="Como você gostaria de ser chamada"
            :aria-invalid="!!errors.name || undefined"
          />
          <FieldError v-if="errors.name">{{ errors.name }}</FieldError>
        </Field>
        <Field :data-invalid="!!errors.phone || undefined">
          <FieldLabel for="booking-phone">Celular (WhatsApp)</FieldLabel>
          <Input
            id="booking-phone"
            v-model="form.phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel-national"
            placeholder="(00) 00000-0000"
            :aria-invalid="!!errors.phone || undefined"
            @blur="formatPhoneField"
          />
          <FieldDescription v-if="isWhatsappEnabled">
            A confirmação e os lembretes chegam no seu WhatsApp.
          </FieldDescription>
          <FieldError v-if="errors.phone">{{ errors.phone }}</FieldError>
        </Field>
      </FieldGroup>

      <SurfaceCard
        v-if="isWhatsappEnabled"
        as="label"
        class="flex cursor-pointer items-start gap-3 p-3.5"
      >
        <input
          v-model="form.remindersOptIn"
          type="checkbox"
          class="size-[22px] shrink-0 accent-(--primary)"
        />
        <span class="flex flex-col gap-1">
          <span class="text-[15px] font-bold">Quero receber lembretes</span>
          <span class="text-[13px] leading-[1.4] text-muted-foreground">
            1 dia antes, no dia do atendimento, 1 hora antes e 30 minutos antes.
          </span>
        </span>
      </SurfaceCard>

      <SiteHoneypotField id="booking-website" v-model="form.website" />

      <p v-if="error && !isSlotTaken" role="alert" class="text-sm text-destructive">
        {{ error }}
      </p>
    </div>

    <footer
      class="sticky bottom-0 mt-auto border-t border-border bg-card pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))] [@media(max-height:500px)]:static"
    >
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-5">
        <SubmitButton
          :is-pending="isSaving"
          label="Confirmar agendamento"
          pending-label="Confirmando…"
        />
        <span class="text-center text-xs text-muted-foreground">
          {{ cancelHint }}
        </span>
      </div>
    </footer>
  </form>
</template>
