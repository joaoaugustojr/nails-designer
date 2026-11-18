<script setup lang="ts">
import { type DateValue, parseDate } from "@internationalized/date";
import { CheckIcon, XIcon } from "@lucide/vue";

import { NAME_MAX_LENGTH } from "#shared/schemas/fields";
import {
  WAITLIST_MAX_DAYS,
  WAITLIST_NOTE_MAX_LENGTH,
  WAITLIST_PERIODS,
} from "#shared/schemas/waitlist";

const props = defineProps<{
  service: { id: number; name: string };
  firstDate: string;
  lastDate: string;
  openWeekdays: number[];
}>();
const isOpen = defineModel<boolean>("open", { required: true });

const {
  form,
  errors,
  error,
  isSaving,
  isSent,
  calendarDates,
  selectDates,
  togglePeriod,
  formatPhoneField,
  reset,
  send,
} = useWaitlistForm(props.service.id);

const isClosed = (day: DateValue) => !isOpenWeekday(day.toString(), props.openWeekdays);

watch(isOpen, (open) => {
  if (open && isSent.value) reset();
});
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent
      side="bottom"
      :show-close-button="false"
      class="mx-auto max-h-[92dvh] w-full max-w-2xl gap-0 overflow-hidden rounded-t-[22px] border-0 bg-card p-0"
    >
      <SheetClose as-child>
        <Button
          variant="secondary"
          size="icon-lg"
          aria-label="Fechar"
          class="absolute top-3 right-3 z-10 bg-card text-foreground hover:bg-card"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </SheetClose>

      <div
        v-if="isSent"
        class="flex flex-col items-center gap-2.5 px-5 pt-14 pb-[calc(28px+env(safe-area-inset-bottom))] text-center"
      >
        <div
          class="flex size-14 items-center justify-center rounded-full bg-(--success)/15 text-(--success)"
        >
          <CheckIcon class="size-7" :stroke-width="2.4" aria-hidden="true" />
        </div>
        <SheetTitle class="text-[22px] font-extrabold">Você está na lista!</SheetTitle>
        <SheetDescription class="text-[15px] leading-normal text-muted-foreground">
          Se abrir uma vaga, te chamamos no WhatsApp.
        </SheetDescription>
        <SheetClose as-child>
          <Button class="mt-3 w-full">Voltar aos horários</Button>
        </SheetClose>
      </div>

      <form v-else class="flex min-h-0 flex-1 flex-col" novalidate @submit.prevent="send">
        <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-5 pb-4">
          <div class="flex flex-col gap-1 pr-12">
            <SheetTitle class="text-[22px] font-extrabold">Lista de espera</SheetTitle>
            <SheetDescription class="text-sm leading-normal text-muted-foreground">
              {{ service.name }} · conte quando fica bom e te chamamos no WhatsApp se abrir uma
              vaga.
            </SheetDescription>
          </div>

          <Field :data-invalid="!!errors.dates || undefined">
            <FieldLabel as="span">Dias que ficam bons (até {{ WAITLIST_MAX_DAYS }})</FieldLabel>
            <SurfaceCard class="self-center">
              <Calendar
                multiple
                :model-value="calendarDates"
                :default-placeholder="parseDate(firstDate)"
                :min-value="parseDate(firstDate)"
                :max-value="parseDate(lastDate)"
                :is-date-disabled="isClosed"
                locale="pt-BR"
                class="[--cell-size:--spacing(10)]"
                @update:model-value="selectDates"
              />
            </SurfaceCard>
            <FieldError v-if="errors.dates">{{ errors.dates }}</FieldError>
          </Field>

          <Field :data-invalid="!!errors.periods || undefined">
            <FieldLabel as="span">Período</FieldLabel>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="period in WAITLIST_PERIODS"
                :key="period"
                type="button"
                :aria-pressed="form.periods.includes(period)"
                class="h-11 rounded-xl border text-sm font-semibold"
                :class="
                  form.periods.includes(period)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card'
                "
                @click="togglePeriod(period)"
              >
                {{ WAITLIST_PERIOD_LABELS[period] }}
              </button>
            </div>
            <FieldError v-if="errors.periods">{{ errors.periods }}</FieldError>
          </Field>

          <Field :data-invalid="!!errors.note || undefined">
            <FieldLabel for="waitlist-note">Observação (opcional)</FieldLabel>
            <Input
              id="waitlist-note"
              v-model="form.note"
              :maxlength="WAITLIST_NOTE_MAX_LENGTH"
              placeholder="Ex.: só depois das 18h30"
            />
            <FieldError v-if="errors.note">{{ errors.note }}</FieldError>
          </Field>

          <Field :data-invalid="!!errors.name || undefined">
            <FieldLabel for="waitlist-name">Nome</FieldLabel>
            <Input
              id="waitlist-name"
              v-model="form.name"
              :maxlength="NAME_MAX_LENGTH"
              autocomplete="name"
              placeholder="Como você gostaria de ser chamada"
              :aria-invalid="!!errors.name || undefined"
            />
            <FieldError v-if="errors.name">{{ errors.name }}</FieldError>
          </Field>

          <Field :data-invalid="!!errors.phone || undefined">
            <FieldLabel for="waitlist-phone">Celular (WhatsApp)</FieldLabel>
            <Input
              id="waitlist-phone"
              v-model="form.phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel-national"
              placeholder="(00) 00000-0000"
              :aria-invalid="!!errors.phone || undefined"
              @blur="formatPhoneField"
            />
            <FieldError v-if="errors.phone">{{ errors.phone }}</FieldError>
          </Field>

          <SiteHoneypotField id="waitlist-website" v-model="form.website" />
        </div>

        <div
          class="flex flex-col gap-2.5 border-t border-border px-5 pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))]"
        >
          <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
          <SubmitButton :is-pending="isSaving" label="Entrar na lista" pending-label="Enviando…" />
          <span class="text-center text-xs text-muted-foreground">
            Usamos seus dados só para te chamar sobre essa vaga.
          </span>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
