<script setup lang="ts">
import { MapPinIcon, MessageCircleIcon } from "@lucide/vue";

import { SiteInstagramIcon } from "#components";

import type { ApiGet } from "~/types/api";

const props = defineProps<{ store: ApiGet<"/api/catalog">["store"] }>();

const links = computed(() => {
  const { address, instagram, whatsapp } = props.store;
  return [
    address && {
      label: "Endereço",
      icon: MapPinIcon,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    },
    instagram && {
      label: "Instagram",
      icon: SiteInstagramIcon,
      href: `https://instagram.com/${instagram}`,
    },
    whatsapp && { label: "WhatsApp", icon: MessageCircleIcon, href: whatsappUrl(whatsapp) },
  ].filter((link) => !!link);
});
</script>

<template>
  <header>
    <div class="relative h-[140px] bg-secondary">
      <img v-if="store.coverPath" :src="store.coverPath" alt="" class="size-full object-cover" />
      <div class="absolute top-3 right-3 rounded-full bg-background/80 backdrop-blur-sm">
        <ThemeSwitch />
      </div>
    </div>

    <div class="relative -mt-10 flex flex-col gap-2.5 px-5">
      <div
        class="flex size-20 items-center justify-center rounded-full border-4 border-background bg-card shadow-sm"
      >
        <StoreMark :name="store.name" :logo-path="store.logoPath" size="sm" />
      </div>
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-extrabold tracking-tight">{{ store.name }}</h1>
        <p v-if="store.about" class="text-sm text-muted-foreground">{{ store.about }}</p>
      </div>
      <nav v-if="links.length" aria-label="Contatos" class="flex flex-wrap gap-2">
        <a
          v-for="link in links"
          :key="link.label"
          :href="link.href"
          target="_blank"
          rel="noopener"
          class="relative inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold after:absolute after:inset-x-0 after:-inset-y-1.5"
        >
          <component :is="link.icon" class="size-3.5" aria-hidden="true" />
          {{ link.label }}
        </a>
      </nav>
    </div>
  </header>
</template>
