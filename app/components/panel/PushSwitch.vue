<script setup lang="ts">
const { isSupported, isEnabled, isPending, error, setEnabled } = usePushNotifications();
</script>

<template>
  <template v-if="isSupported">
    <SurfaceCard class="flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-2 text-sm">
      <label for="push-enabled" class="flex flex-col">
        Notificações neste celular
        <span class="text-xs text-muted-foreground">
          Novos agendamentos, cancelamentos, lista de espera e 30 min antes de cada cliente
        </span>
      </label>
      <Switch
        id="push-enabled"
        size="sm"
        :model-value="isEnabled"
        :disabled="isPending"
        @update:model-value="setEnabled"
      />
    </SurfaceCard>
    <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
  </template>
</template>
