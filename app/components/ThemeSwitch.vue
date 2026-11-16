<script setup lang="ts">
import { MoonIcon, SunIcon } from "@lucide/vue";

const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === "dark");
const label = computed(() => (isDark.value ? "Usar tema claro" : "Usar tema escuro"));

function toggleTheme() {
  colorMode.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <ClientOnly>
    <Button variant="ghost" size="icon-lg" :aria-label="label" :title="label" @click="toggleTheme">
      <SunIcon v-if="isDark" aria-hidden="true" />
      <MoonIcon v-else aria-hidden="true" />
    </Button>
  </ClientOnly>
</template>
