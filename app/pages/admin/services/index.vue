<script setup lang="ts">
import { PlusIcon } from "@lucide/vue";
import { VueDraggable } from "vue-draggable-plus";

definePageMeta({ layout: "panel" });
useHead({ title: "Serviços" });

const { data: services, refresh } = await useFetch("/api/admin/services", { default: () => [] });
const orderError = ref("");

async function setActive(id: number, active: boolean) {
  await $fetch(`/api/admin/services/${id}`, { method: "PATCH", body: { active } });
  await refresh();
}

async function saveOrder() {
  orderError.value = "";
  try {
    const ids = services.value.map((service) => service.id);
    await $fetch("/api/admin/services/order", { method: "PUT", body: { ids } });
  } catch {
    orderError.value = "Não foi possível salvar a nova ordem. Tente novamente.";
    await refresh();
  }
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
      <p v-if="orderError" role="alert" class="text-sm text-destructive">{{ orderError }}</p>
      <VueDraggable
        v-model="services"
        v-bind="SORTABLE_OPTIONS"
        handle=".drag-handle"
        class="flex flex-col gap-2.5"
        @update="saveOrder"
      >
        <PanelServiceCard
          v-for="service in services"
          :key="service.id"
          :service="service"
          @toggle="setActive(service.id, $event)"
        />
      </VueDraggable>
      <p v-if="services.length" class="mt-1 text-xs text-muted-foreground">
        Arraste pela alça para mudar a ordem no site. Serviço desligado some do site, mas os
        agendamentos dele continuam.
      </p>
      <p v-else class="py-10 text-center text-sm text-muted-foreground">
        Nenhum serviço cadastrado ainda.
      </p>
    </section>
  </div>
</template>
