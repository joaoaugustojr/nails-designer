<script setup lang="ts">
import { CalendarDays, ChevronRight, Clock } from "@lucide/vue";

import type { ApiGet } from "~/types/api";

const props = defineProps<{ service: ApiGet<"/api/catalog">["services"][number] }>();
const emit = defineEmits<{ details: [] }>();

const coverPath = computed(() => props.service.photos[0]?.path);
</script>

<template>
  <SurfaceCard as="article" class="flex items-center gap-3 p-2.5">
    <img
      v-if="coverPath"
      :src="coverPath"
      alt=""
      class="size-24 shrink-0 rounded-[10px] object-cover"
    />
    <div v-else class="size-24 shrink-0 rounded-[10px] bg-secondary" />
    <div class="flex min-w-0 flex-1 flex-col items-start gap-0.5">
      <h3 class="text-[15px] font-bold">{{ service.name }}</h3>
      <span class="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Clock class="size-3.5" />
        {{ formatDuration(service.durationMinutes) }}
      </span>
      <strong class="text-[15px] text-primary">{{ formatPriceShort(service.priceCents) }}</strong>
      <Button
        variant="quiet"
        size="inline"
        class="-my-2 gap-1 underline underline-offset-3"
        @click="emit('details')"
      >
        Saiba mais
        <ChevronRight />
      </Button>
    </div>
    <Button as-child size="md" class="self-center">
      <NuxtLink :to="`/book/${service.id}`">
        <CalendarDays />
        Agendar
      </NuxtLink>
    </Button>
  </SurfaceCard>
</template>
