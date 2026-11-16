<script setup lang="ts">
import { ChevronLeftIcon } from "@lucide/vue";

defineProps<{ title: string; step: string; backTo: string }>();
</script>

<template>
  <header class="flex h-14 items-center gap-1 border-b border-border bg-card px-2">
    <Button as-child variant="ghost" size="icon-lg" aria-label="Voltar">
      <NuxtLink :to="backTo"><ChevronLeftIcon aria-hidden="true" /></NuxtLink>
    </Button>
    <h1 class="text-base font-bold">{{ title }}</h1>
    <span class="ml-auto pr-3 text-[13px] text-muted-foreground">{{ step }}</span>
  </header>
</template>
