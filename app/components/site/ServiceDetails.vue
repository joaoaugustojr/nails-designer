<script setup lang="ts">
import { CheckIcon, XIcon } from "@lucide/vue";

import type { ApiGet } from "~/types/api";

defineProps<{ service: ApiGet<"/api/catalog">["services"][number] | null }>();
const isOpen = defineModel<boolean>("open", { required: true });
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent
      side="bottom"
      :show-close-button="false"
      class="mx-auto max-h-[90dvh] w-full max-w-2xl gap-0 overflow-hidden rounded-t-[22px] border-0 bg-card p-0"
    >
      <template v-if="service">
        <SheetClose as-child>
          <Button
            variant="secondary"
            size="icon-lg"
            aria-label="Fechar"
            class="absolute top-3 right-3 z-10 bg-card text-foreground hover:bg-card"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </SheetClose>

        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SitePhotoGallery v-if="service.photos.length" :photos="service.photos" />

          <div class="flex flex-col gap-3 px-5 pt-4" :class="{ 'pt-16': !service.photos.length }">
            <div class="flex flex-col gap-1">
              <SheetTitle class="text-[22px] font-extrabold">{{ service.name }}</SheetTitle>
              <SiteServiceSummary :service="service" class="text-sm" />
            </div>
            <SheetDescription class="text-[15px] leading-[1.55] text-foreground/85">
              {{ service.details }}
            </SheetDescription>
            <div v-if="service.includes.length" class="flex flex-col gap-2 pb-4">
              <h3 class="text-[13px] font-bold tracking-wide text-muted-foreground uppercase">
                O que inclui
              </h3>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="item in service.includes"
                  :key="item"
                  class="flex items-start gap-2 text-sm text-foreground/85"
                >
                  <CheckIcon class="size-[18px] shrink-0 text-(--success)" aria-hidden="true" />
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="border-t border-border px-5 pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))]">
          <Button as-child class="w-full">
            <NuxtLink :to="`/book/${service.id}`">Agendar este serviço</NuxtLink>
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
