<script setup lang="ts">
import { PlusIcon, Trash2Icon } from "@lucide/vue";

import {
  dayRangesSchema,
  DEFAULT_RANGE,
  MAX_RANGES_PER_DAY,
  type TimeRange,
} from "#shared/schemas/schedule";

const props = defineProps<{ label: string; ranges: TimeRange[] }>();
const emit = defineEmits<{ save: [ranges: TimeRange[]] }>();

const isOpen = computed(() => props.ranges.length > 0);
const isEditing = ref(false);
const draft = ref<{ start: string; end: string }[]>([]);
const error = ref("");

const summary = computed(() =>
  isOpen.value
    ? props.ranges
        .map((range) => `${minutesToTime(range.startMinute)}–${minutesToTime(range.endMinute)}`)
        .join(" · ")
    : "Fechado",
);
const canAddRange = computed(() => draft.value.length < MAX_RANGES_PER_DAY);

function setOpen(open: boolean) {
  emit("save", open ? [DEFAULT_RANGE] : []);
}

function startEditing() {
  draft.value = props.ranges.map((range) => ({
    start: minutesToTime(range.startMinute),
    end: minutesToTime(range.endMinute),
  }));
  error.value = "";
  isEditing.value = true;
}

function addRange() {
  draft.value.push({ start: "", end: "" });
}

function removeRange(index: number) {
  draft.value.splice(index, 1);
}

function toRanges() {
  return draft.value
    .map((range) => ({
      startMinute: timeToMinutes(range.start) ?? Number.NaN,
      endMinute: timeToMinutes(range.end) ?? Number.NaN,
    }))
    .sort((first, second) => first.startMinute - second.startMinute);
}

function save() {
  const parsed = dayRangesSchema.safeParse({ ranges: toRanges() });
  if (!parsed.success) {
    error.value = "Confira os horários: cada faixa termina depois de começar e não se sobrepõe.";
    return;
  }
  emit("save", parsed.data.ranges);
  isEditing.value = false;
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex min-h-[46px] items-center gap-2.5 px-3.5">
      <Switch
        size="sm"
        :model-value="isOpen"
        :aria-label="`${isOpen ? 'Fechar' : 'Abrir'} ${label}`"
        @update:model-value="setOpen"
      />
      <span class="w-10 text-sm font-bold">{{ label }}</span>
      <span
        class="flex-1 text-[13px]"
        :class="isOpen ? 'text-foreground' : 'text-muted-foreground'"
      >
        {{ summary }}
      </span>
      <button
        v-if="isOpen && !isEditing"
        type="button"
        class="h-11 text-[13px] font-bold text-primary"
        @click="startEditing"
      >
        Editar
      </button>
    </div>

    <div v-if="isEditing" class="flex flex-col gap-2.5 px-3.5 pb-3.5">
      <div v-for="(range, index) in draft" :key="index" class="flex items-center gap-2">
        <Input v-model="range.start" type="time" :aria-label="`Início da faixa ${index + 1}`" />
        <span class="text-sm text-muted-foreground">às</span>
        <Input v-model="range.end" type="time" :aria-label="`Fim da faixa ${index + 1}`" />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          :aria-label="`Remover faixa ${index + 1}`"
          @click="removeRange(index)"
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
      <Button
        v-if="canAddRange"
        type="button"
        variant="outline"
        size="md"
        class="self-start"
        @click="addRange"
      >
        <PlusIcon aria-hidden="true" />
        Adicionar faixa
      </Button>
      <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
      <div class="flex gap-2">
        <Button type="button" variant="outline" size="md" class="flex-1" @click="isEditing = false">
          Cancelar
        </Button>
        <Button type="button" variant="ink" size="md" class="flex-1" @click="save">Salvar</Button>
      </div>
    </div>
  </div>
</template>
