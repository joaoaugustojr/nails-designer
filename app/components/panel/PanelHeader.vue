<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <header class="flex items-center justify-between gap-3 border-b border-border bg-card p-5">
    <h1 class="text-[22px] font-extrabold">{{ title }}</h1>
    <slot />
  </header>
</template>
