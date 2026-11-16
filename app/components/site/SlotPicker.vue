<script setup lang="ts">
defineProps<{ startMinutes: number[] }>();
const selected = defineModel<number | null>({ required: true });
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <button
      v-for="start in startMinutes"
      :key="start"
      type="button"
      :aria-pressed="start === selected"
      class="h-11 rounded-[10px] border text-[15px] font-bold"
      :class="
        start === selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card'
      "
      @click="selected = start"
    >
      {{ minutesToTime(start) }}
    </button>
  </div>
</template>
