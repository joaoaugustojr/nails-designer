<script setup lang="ts">
const props = defineProps<{ service: ServiceSummary }>();
const emit = defineEmits<{ toggle: [active: boolean] }>();

const coverPath = computed(() => props.service.photos[0]?.path);
const summary = computed(
  () =>
    `${formatDuration(props.service.durationMinutes)} · ${formatPrice(props.service.priceCents)}`,
);
const toggleLabel = computed(
  () => `${props.service.active ? "Desativar" : "Ativar"} ${props.service.name}`,
);
</script>

<template>
  <div class="flex items-center gap-3 rounded-[14px] border border-border bg-card p-2.5">
    <img
      v-if="coverPath"
      :src="coverPath"
      alt=""
      class="size-14 shrink-0 rounded-[10px] object-cover"
    />
    <div v-else class="size-14 shrink-0 rounded-[10px] bg-secondary" />
    <NuxtLink :to="`/admin/services/${service.id}`" class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-[15px] font-bold">{{ service.name }}</span>
      <span class="text-[13px] text-muted-foreground">{{ summary }}</span>
    </NuxtLink>
    <Switch
      :model-value="service.active"
      :aria-label="toggleLabel"
      @update:model-value="emit('toggle', $event)"
    />
  </div>
</template>
