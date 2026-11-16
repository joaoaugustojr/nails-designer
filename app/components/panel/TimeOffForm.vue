<script setup lang="ts">
import { type TimeOffInput, timeOffSchema } from "#shared/schemas/schedule";

const props = withDefaults(defineProps<{ date?: string; isWholeDay?: boolean }>(), {
  date: () => new Date().toLocaleDateString("sv"),
  isWholeDay: true,
});
const emit = defineEmits<{ save: [timeOff: TimeOffInput]; cancel: [] }>();

const form = reactive({
  startDate: props.date,
  endDate: props.date,
  isWholeDay: props.isWholeDay,
  startTime: "09:00",
  endTime: "18:00",
  reason: "",
});
const error = ref("");

function save() {
  const parsed = timeOffSchema.safeParse({
    startDate: form.startDate,
    endDate: form.endDate,
    startMinute: form.isWholeDay ? null : timeToMinutes(form.startTime),
    endMinute: form.isWholeDay ? null : timeToMinutes(form.endTime),
    reason: form.reason,
  });
  const isInOrder = form.endDate >= form.startDate;
  if (!parsed.success || !isInOrder) {
    error.value = "Confira as datas e os horários.";
    return;
  }
  emit("save", parsed.data);
}
</script>

<template>
  <form
    class="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5"
    novalidate
    @submit.prevent="save"
  >
    <div class="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel for="time-off-start">De</FieldLabel>
        <Input id="time-off-start" v-model="form.startDate" type="date" />
      </Field>
      <Field>
        <FieldLabel for="time-off-end">Até</FieldLabel>
        <Input id="time-off-end" v-model="form.endDate" type="date" />
      </Field>
    </div>
    <Field orientation="horizontal" class="justify-between">
      <FieldLabel for="time-off-whole-day">Dia inteiro</FieldLabel>
      <Switch id="time-off-whole-day" v-model="form.isWholeDay" />
    </Field>
    <div v-if="!form.isWholeDay" class="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel for="time-off-start-time">Das</FieldLabel>
        <Input id="time-off-start-time" v-model="form.startTime" type="time" />
      </Field>
      <Field>
        <FieldLabel for="time-off-end-time">Às</FieldLabel>
        <Input id="time-off-end-time" v-model="form.endTime" type="time" />
      </Field>
    </div>
    <Field>
      <FieldLabel for="time-off-reason">Motivo (opcional)</FieldLabel>
      <Input id="time-off-reason" v-model="form.reason" maxlength="120" placeholder="Ex.: Natal" />
    </Field>
    <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
    <div class="flex gap-2">
      <Button type="button" variant="outline" size="md" class="flex-1" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" size="md" class="flex-1">Salvar</Button>
    </div>
  </form>
</template>
