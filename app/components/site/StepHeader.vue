<script setup lang="ts">
import { ChevronLeftIcon } from "@lucide/vue";

defineProps<{ title: string; step: string; backTo: string }>();
</script>

<template>
  <header class="border-b border-border bg-card">
    <div class="mx-auto flex h-14 w-full max-w-2xl items-center gap-1 px-2">
      <Button as-child variant="ghost" size="icon-lg" aria-label="Voltar">
        <NuxtLink :to="backTo"><ChevronLeftIcon aria-hidden="true" /></NuxtLink>
      </Button>
      <h1 class="text-base font-bold">{{ title }}</h1>
      <span class="ml-auto pr-3 text-[13px] text-muted-foreground">{{ step }}</span>
    </div>
  </header>
</template>
