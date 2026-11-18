<script setup lang="ts">
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  serviceId: number | null;
  booked?: { name: string; durationMinutes: number; priceCents: number };
}>();

const { data: catalog } = useFetch("/api/catalog", { lazy: true });
const service = computed(() => {
  const current = catalog.value?.services.find((item) => item.id === props.serviceId);
  if (!current) return null;
  return { ...current, ...props.booked };
});
const isOpen = ref(false);
</script>

<template>
  <Button
    v-if="service"
    v-bind="$attrs"
    type="button"
    variant="quiet"
    size="inline"
    class="relative h-auto underline underline-offset-3 after:absolute after:inset-x-0 after:-inset-y-3"
    @click="isOpen = true"
  >
    Saiba mais
  </Button>
  <SiteServiceDetails v-model:open="isOpen" :service="service" is-in-booking-flow />
</template>
