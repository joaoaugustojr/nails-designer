<script setup lang="ts">
import { SearchIcon } from "@lucide/vue";

definePageMeta({ layout: "panel" });
useHead({ title: "Clientes" });

const { search, clients, total, hasMore, isLoadingMore, loadMore, cancelNextBooking } =
  useClients();
const { requests: waitlist, resolve } = useWaitlist();
</script>

<template>
  <div>
    <PanelHeader title="Clientes">
      <span class="text-[13px] text-muted-foreground">
        {{ plural(total, "cliente", "clientes") }}
      </span>
      <template #bottom>
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
      </template>
    </PanelHeader>

    <section v-if="waitlist.length && !search" class="flex flex-col gap-2.5 px-5 pt-4">
      <PanelSectionTitle>Lista de espera · {{ waitlist.length }}</PanelSectionTitle>
      <PanelWaitlistCard
        v-for="request in waitlist"
        :key="request.id"
        :request="request"
        @resolve="resolve(request)"
      />
      <PanelSectionTitle class="mt-2">Clientes</PanelSectionTitle>
    </section>

    <section class="flex flex-col gap-2.5 px-5 py-4">
      <PanelClientCard
        v-for="client in clients"
        :key="client.id"
        :client="client"
        @cancel-next="cancelNextBooking(client)"
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
