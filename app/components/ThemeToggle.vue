<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunIcon } from "@lucide/vue";

const colorMode = useColorMode();

const options = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: MonitorIcon },
];

function select(value: unknown) {
  if (typeof value === "string" && value) colorMode.preference = value;
}
</script>

<template>
  <ClientOnly>
    <ToggleGroup
      type="single"
      variant="outline"
      size="lg"
      :spacing="2"
      class="w-full"
      :model-value="colorMode.preference"
      aria-label="Tema"
      @update:model-value="select"
    >
      <ToggleGroupItem
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :aria-label="option.label"
        class="flex-1"
      >
        <component :is="option.icon" aria-hidden="true" />
        {{ option.label }}
      </ToggleGroupItem>
    </ToggleGroup>
  </ClientOnly>
</template>
