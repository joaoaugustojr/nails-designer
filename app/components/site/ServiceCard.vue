<script setup lang="ts">
import type { ApiGet } from "~/types/api";

const props = defineProps<{ service: ApiGet<"/api/catalog">["services"][number] }>();
const emit = defineEmits<{ details: [] }>();

const coverPath = computed(() => props.service.photos[0]?.path);
</script>

<template>
  <SurfaceCard as="article" class="flex gap-3 p-2.5">
    <img
      v-if="coverPath"
      :src="coverPath"
      alt=""
      class="size-24 shrink-0 rounded-[10px] object-cover"
    />
    <div v-else class="size-24 shrink-0 rounded-[10px] bg-secondary" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <h3 class="text-[15px] font-bold">{{ service.name }}</h3>
      <SiteServiceSummary :service="service" class="text-[13px]" />
      <div class="mt-auto flex items-center justify-between gap-2">
        <Button
          variant="quiet"
          size="inline"
          class="underline underline-offset-3"
          @click="emit('details')"
        >
          Saiba mais
        </Button>
        <Button as-child size="sm" class="relative after:absolute after:inset-x-0 after:-inset-y-1">
          <NuxtLink :to="`/book/${service.id}`">Agendar</NuxtLink>
        </Button>
      </div>
    </div>
  </SurfaceCard>
</template>
