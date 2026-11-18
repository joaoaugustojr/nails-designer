<script setup lang="ts">
import type { ApiGet } from "~/types/api";

const props = defineProps<{ request: ApiGet<"/api/admin/waitlist">[number] }>();
const emit = defineEmits<{ resolve: [] }>();
const route = useRoute();

const wish = computed(() => formatWaitlistWish(props.request.dates, props.request.periods));

const whatsappLink = computed(() =>
  whatsappUrl(
    props.request.clientPhone,
    `Oi, ${firstName(props.request.clientName)}! Abriu uma vaga de ${props.request.serviceName}. Ainda tem interesse?`,
  ),
);

const bookingPath = computed(() =>
  newBookingPath({
    date: props.request.dates[0]!,
    serviceId: props.request.serviceId ?? undefined,
    name: props.request.clientName,
    phone: props.request.clientPhone,
    from: route.fullPath,
  }),
);
</script>

<template>
  <SurfaceCard as="article" class="flex flex-col gap-1 px-3.5 pt-3 pb-1">
    <h3 class="text-[15px] font-bold">{{ request.clientName }}</h3>
    <span class="text-[13px] text-muted-foreground">{{ request.serviceName }}</span>
    <span class="text-[13px]">{{ wish }}</span>
    <span v-if="request.note" class="text-[13px] text-muted-foreground italic">
      “{{ request.note }}”
    </span>
    <div class="flex gap-4">
      <Button as-child variant="link" size="inline">
        <a :href="whatsappLink" target="_blank" rel="noopener">WhatsApp</a>
      </Button>
      <Button as-child variant="link" size="inline">
        <NuxtLink :to="bookingPath">Agendar</NuxtLink>
      </Button>
      <Button variant="quiet" size="inline" class="ml-auto" @click="emit('resolve')">
        Resolvido
      </Button>
    </div>
  </SurfaceCard>
</template>
