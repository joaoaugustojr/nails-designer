<script setup lang="ts">
import type { ApiGet } from "~/types/api";

type CatalogService = ApiGet<"/api/catalog">["services"][number];

const { data: catalog } = await useFetch("/api/catalog");

const services = computed(() => catalog.value?.services ?? []);
const detailsService = ref<CatalogService | null>(null);
const isDetailsOpen = ref(false);

function openDetails(service: CatalogService) {
  detailsService.value = service;
  isDetailsOpen.value = true;
}
</script>

<template>
  <main v-if="catalog" class="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-5">
    <SiteStoreHero :store="catalog.store" />

    <div class="flex items-baseline justify-between px-5 pt-[18px] pb-2">
      <h2 class="text-[17px] font-bold">Escolha o serviço</h2>
      <span class="text-[13px] text-muted-foreground">
        {{ plural(services.length, "serviço", "serviços") }}
      </span>
    </div>

    <div class="flex flex-col gap-3 px-5">
      <SiteServiceCard
        v-for="service in services"
        :key="service.id"
        :service="service"
        @details="openDetails(service)"
      />
      <p v-if="!services.length" class="text-sm text-muted-foreground">
        Nenhum serviço disponível no momento.
      </p>
    </div>

    <SiteServiceDetails v-model:open="isDetailsOpen" :service="detailsService" />
  </main>
</template>
