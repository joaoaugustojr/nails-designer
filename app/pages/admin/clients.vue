<script setup lang="ts">
import { SearchIcon } from "@lucide/vue";

definePageMeta({ layout: "panel" });
useHead({ title: "Clientes" });

const { search, clients, total, timezone, hasMore, isLoadingMore, loadMore } = useClients();

const countLabel = computed(() => (total.value === 1 ? "1 cliente" : `${total.value} clientes`));
</script>

<template>
  <div>
    <header class="flex flex-col gap-3.5 border-b border-border bg-card px-5 pt-5 pb-3.5">
      <div class="flex items-baseline justify-between">
        <h1 class="text-[22px] font-extrabold">Clientes</h1>
        <span class="text-[13px] text-muted-foreground">{{ countLabel }}</span>
      </div>
      <div class="relative">
        <SearchIcon
          :size="18"
          aria-hidden="true"
          class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="search"
          type="search"
          aria-label="Buscar cliente"
          placeholder="Buscar por nome ou telefone"
          class="pl-10"
        />
      </div>
    </header>

    <section class="flex flex-col gap-2.5 px-5 py-4">
      <PanelClientCard
        v-for="client in clients"
        :key="client.id"
        :client="client"
        :timezone="timezone"
      />
      <p v-if="!clients.length" class="py-10 text-center text-sm text-muted-foreground">
        {{
          search
            ? "Nenhuma cliente encontrada."
            : "As clientes aparecem aqui após o primeiro agendamento."
        }}
      </p>
      <Button
        v-if="hasMore"
        variant="outline"
        size="md"
        class="self-center"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? "Carregando…" : "Mostrar mais" }}
      </Button>
    </section>
  </div>
</template>
