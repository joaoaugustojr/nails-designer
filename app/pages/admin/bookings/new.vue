<script setup lang="ts">
const route = useRoute();
const initialDate = typeof route.query.date === "string" ? route.query.date : "";
const agendaPath = initialDate ? `/admin?date=${initialDate}` : "/admin";

const {
  form,
  errors,
  conflict,
  formError,
  isSaving,
  serviceIds,
  serviceName,
  endTime,
  suggestions,
  chooseClient,
  formatPhoneField,
  save,
} = usePanelBookingForm(initialDate);
const { isWhatsappEnabled } = useRuntimeConfig().public;

useHead({ title: "Novo agendamento" });

const conflictText = computed(() => {
  if (!conflict.value) return "";
  const { clientName, startMinute, endMinute } = conflict.value;
  return `Conflita com ${clientName}, ${minutesToTime(startMinute)} às ${minutesToTime(endMinute)}. Para encaixar, cancele esse agendamento antes.`;
});
</script>

<template>
  <form class="flex min-h-dvh flex-col" novalidate @submit.prevent="save">
    <PanelDetailHeader title="Novo agendamento" :back-to="agendaPath" />

    <FieldGroup class="flex-1 px-5 py-4">
      <Field :data-invalid="!!errors.name || undefined">
        <FieldLabel for="client-name">Cliente</FieldLabel>
        <Input
          id="client-name"
          v-model="form.name"
          maxlength="80"
          autocomplete="off"
          placeholder="Nome da cliente"
          :aria-invalid="!!errors.name || undefined"
        />
        <div v-if="suggestions.length" class="flex flex-col">
          <button
            v-for="client in suggestions"
            :key="client.id"
            type="button"
            class="flex min-h-11 items-center justify-between gap-3 border-b border-border text-left text-sm last:border-b-0"
            @click="chooseClient(client)"
          >
            <span class="font-semibold">{{ client.name }}</span>
            <span class="text-muted-foreground">{{ formatPhone(client.phone) }}</span>
          </button>
        </div>
        <FieldError v-if="errors.name">{{ errors.name }}</FieldError>
      </Field>

      <Field :data-invalid="!!errors.phone || undefined">
        <FieldLabel for="client-phone">Celular (WhatsApp)</FieldLabel>
        <Input
          id="client-phone"
          v-model="form.phone"
          type="tel"
          inputmode="tel"
          placeholder="(00) 00000-0000"
          :aria-invalid="!!errors.phone || undefined"
          @blur="formatPhoneField"
        />
        <FieldError v-if="errors.phone">{{ errors.phone }}</FieldError>
      </Field>

      <Field>
        <FieldLabel for="service">Serviço</FieldLabel>
        <OptionSelect
          id="service"
          v-model="form.serviceId"
          :options="serviceIds"
          :format="serviceName"
        />
      </Field>

      <div class="grid grid-cols-2 gap-3">
        <Field :data-invalid="!!errors.date || undefined">
          <FieldLabel for="date">Dia</FieldLabel>
          <Input
            id="date"
            v-model="form.date"
            type="date"
            :aria-invalid="!!errors.date || undefined"
          />
        </Field>
        <Field :data-invalid="!!errors.startMinute || undefined">
          <FieldLabel for="time">Horário</FieldLabel>
          <Input
            id="time"
            v-model="form.time"
            type="time"
            :aria-invalid="!!errors.startMinute || undefined"
          />
        </Field>
      </div>
      <FieldDescription v-if="endTime">Termina às {{ endTime }}.</FieldDescription>
      <FieldError v-if="errors.date || errors.startMinute">
        {{ errors.date ?? errors.startMinute }}
      </FieldError>

      <Field :data-invalid="!!errors.priceCents || undefined">
        <FieldLabel for="price">Preço (R$)</FieldLabel>
        <Input
          id="price"
          v-model="form.price"
          inputmode="decimal"
          placeholder="0,00"
          :aria-invalid="!!errors.priceCents || undefined"
        />
        <FieldError v-if="errors.priceCents">{{ errors.priceCents }}</FieldError>
      </Field>

      <SurfaceCard v-if="isWhatsappEnabled" class="p-3.5">
        <Field orientation="horizontal" class="justify-between">
          <FieldLabel for="reminders" class="text-[15px]">Lembretes no WhatsApp</FieldLabel>
          <Switch id="reminders" v-model="form.remindersOptIn" />
        </Field>
      </SurfaceCard>
    </FieldGroup>

    <footer
      class="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card px-5 pt-3.5 pb-5"
    >
      <p v-if="conflictText" role="alert" class="text-sm text-destructive">
        {{ conflictText }}
        <NuxtLink :to="`/admin?date=${conflict!.date}`" class="font-bold underline">
          Ver na agenda
        </NuxtLink>
      </p>
      <p v-if="formError" role="alert" class="text-sm text-destructive">{{ formError }}</p>
      <SubmitButton
        class="w-full"
        :is-pending="isSaving"
        label="Agendar"
        pending-label="Agendando…"
      />
    </footer>
  </form>
</template>
