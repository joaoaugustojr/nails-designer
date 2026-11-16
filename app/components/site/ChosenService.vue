<script setup lang="ts">
defineProps<{
  service: { name: string; durationMinutes: number; priceCents: number; photoPath: string | null };
}>();
</script>

<template>
  <SurfaceCard class="flex items-center gap-3 py-1 pr-3.5 pl-3.5">
    <img
      v-if="service.photoPath"
      :src="service.photoPath"
      alt=""
      class="size-11 shrink-0 rounded-[10px] object-cover"
    />
    <div v-else class="size-11 shrink-0 rounded-[10px] bg-secondary" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5 py-2">
      <span class="truncate text-[15px] font-bold">{{ service.name }}</span>
      <SiteServiceSummary :service="service" class="text-[13px]" />
    </div>
    <Button as-child variant="link" size="inline">
      <NuxtLink to="/">Trocar</NuxtLink>
    </Button>
  </SurfaceCard>
</template>
