<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <header class="flex flex-col gap-3.5 border-b border-border bg-card p-5">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-[22px] font-extrabold">{{ title }}</h1>
      <slot />
    </div>
    <slot name="bottom" />
  </header>
</template>
