<script setup lang="ts">
import { ChevronLeftIcon } from "@lucide/vue";

defineProps<{ title: string; backTo: string }>();
</script>

<template>
  <header
    class="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-card px-2"
  >
    <NuxtLink :to="backTo" aria-label="Voltar" class="flex size-11 items-center justify-center">
      <ChevronLeftIcon :size="22" aria-hidden="true" />
    </NuxtLink>
    <h1 class="text-base font-bold">{{ title }}</h1>
    <div class="ml-auto pr-1">
      <slot />
    </div>
  </header>
</template>
