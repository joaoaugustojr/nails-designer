<script setup lang="ts">
defineProps<{ service: { durationMinutes: number; priceCents: number } }>();
</script>

<template>
  <span class="text-muted-foreground">
    {{ formatDuration(service.durationMinutes) }} ·
    <strong class="text-primary">{{ formatPriceShort(service.priceCents) }}</strong>
  </span>
</template>
