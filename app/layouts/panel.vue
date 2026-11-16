<script setup lang="ts">
import { CalendarIcon, ClockIcon, StoreIcon, TextAlignStartIcon } from "@lucide/vue";

const tabs = [
  { to: "/admin", label: "Agenda", icon: CalendarIcon },
  { to: "/admin/services", label: "Serviços", icon: TextAlignStartIcon },
  { to: "/admin/hours", label: "Horários", icon: ClockIcon },
  { to: "/admin/store", label: "Loja", icon: StoreIcon },
];
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <div class="flex flex-1 flex-col pb-[72px]">
      <slot />
    </div>

    <nav
      aria-label="Painel"
      class="fixed inset-x-0 bottom-0 grid h-[72px] grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
        exact-active-class="font-bold !text-primary"
      >
        <component :is="tab.icon" :size="22" :stroke-width="2" aria-hidden="true" />
        {{ tab.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
