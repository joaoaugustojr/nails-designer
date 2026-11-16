<script setup lang="ts">
import { PlusIcon } from "@lucide/vue";

definePageMeta({ layout: "panel" });
useHead({ title: "Serviços" });

const { data: services, refresh } = await useFetch("/api/admin/services", { default: () => [] });

async function setActive(id: number, active: boolean) {
  await $fetch(`/api/admin/services/${id}`, { method: "PATCH", body: { active } });
  await refresh();
}
</script>

<template>
  <div>
    <PanelHeader title="Serviços">
      <Button as-child size="md">
        <NuxtLink to="/admin/services/new">
          <PlusIcon aria-hidden="true" />
          Novo
        </NuxtLink>
      </Button>
    </PanelHeader>

    <section class="flex flex-col gap-2.5 px-5 py-4">
      <PanelServiceCard
        v-for="service in services"
        :key="service.id"
        :service="service"
        @toggle="setActive(service.id, $event)"
      />
      <p v-if="services.length" class="mt-1 text-xs text-muted-foreground">
        Serviço desligado some do site, mas os agendamentos dele continuam.
      </p>
      <p v-else class="py-10 text-center text-sm text-muted-foreground">
        Nenhum serviço cadastrado ainda.
      </p>
    </section>
  </div>
</template>
