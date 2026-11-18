<script setup lang="ts">
defineProps<{ id: string }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <div aria-hidden="true" class="absolute -left-[9999px]">
    <label :for="id">Site</label>
    <input :id="id" v-model="model" tabindex="-1" autocomplete="off" />
  </div>
</template>
