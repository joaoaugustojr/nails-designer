<script setup lang="ts">
const props = defineProps<{
  id: string;
  options: number[];
  format: (value: number) => string;
  size?: "default" | "sm";
  disabled?: boolean;
}>();
const model = defineModel<number>({ required: true });

function select(value: unknown) {
  if (typeof value === "number") model.value = value;
}
</script>

<template>
  <Select :model-value="model" :disabled="disabled" @update:model-value="select">
    <SelectTrigger :id="id" :size="size">
      <SelectValue>{{ props.format(model) }}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem v-for="option in options" :key="option" :value="option">
          {{ props.format(option) }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
