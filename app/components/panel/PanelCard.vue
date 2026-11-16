<script setup lang="ts">
withDefaults(defineProps<{ as?: string }>(), { as: "div" });
</script>

<template>
  <component :is="as" class="rounded-[14px] border border-border bg-card">
    <slot />
  </component>
</template>
