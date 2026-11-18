<script setup lang="ts">
const model = defineModel<string>({ required: true });

function maskTyped(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = maskPhone(input.value);
  model.value = input.value;
}
</script>

<template>
  <Input
    :model-value="model"
    type="tel"
    inputmode="tel"
    placeholder="(00) 00000-0000"
    @input="maskTyped"
  />
</template>
