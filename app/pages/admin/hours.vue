<script setup lang="ts">
import { PlusIcon, XIcon } from "@lucide/vue";

definePageMeta({ layout: "panel" });
useHead({ title: "Horários" });

const {
  rules,
  week,
  timeOffItems,
  error,
  numericRules,
  cancelDeadlineRule,
  saveDay,
  updateRules,
  removeTimeOff,
  refreshTimeOff,
} = useSchedule();

const isAddingTimeOff = ref(false);

async function onTimeOffSaved() {
  isAddingTimeOff.value = false;
  await refreshTimeOff();
}
</script>

<template>
  <div>
    <PanelHeader title="Horários" />

    <div class="flex flex-col gap-2.5 px-5 py-4">
      <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>

      <PanelSectionTitle>Expediente da semana</PanelSectionTitle>
      <SurfaceCard class="flex flex-col divide-y divide-border">
        <PanelWorkingDay
          v-for="day in week"
          :key="day.value"
          :label="day.label"
          :ranges="day.ranges"
          @save="saveDay(day.value, $event)"
        />
      </SurfaceCard>

      <template v-if="rules">
        <PanelSectionTitle class="mt-1.5">Regras</PanelSectionTitle>
        <SurfaceCard class="flex flex-col divide-y divide-border">
          <div
            v-for="rule in numericRules"
            :key="rule.key"
            class="flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-1.5 text-sm"
          >
            <label :for="rule.key">{{ rule.label }}</label>
            <OptionSelect
              :id="rule.key"
              size="sm"
              :model-value="rules[rule.key]"
              :options="rule.options"
              :format="rule.format"
              @update:model-value="updateRules({ [rule.key]: $event })"
            />
          </div>
        </SurfaceCard>

        <PanelSectionTitle class="mt-1.5">Cancelamento</PanelSectionTitle>
        <SurfaceCard class="flex flex-col divide-y divide-border">
          <div class="flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-2 text-sm">
            <label for="client-can-cancel" class="flex flex-col">
              Cliente pode cancelar pelo link
              <span class="text-xs text-muted-foreground">
                Desligado: só você cancela, pela agenda
              </span>
            </label>
            <Switch
              id="client-can-cancel"
              size="sm"
              :model-value="rules.clientCanCancel"
              @update:model-value="updateRules({ clientCanCancel: $event })"
            />
          </div>
          <div
            class="flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-1.5 text-sm"
            :class="{ 'opacity-45': !rules.clientCanCancel }"
          >
            <label for="cancel-deadline">Cancelar até</label>
            <OptionSelect
              id="cancel-deadline"
              size="sm"
              :disabled="!rules.clientCanCancel"
              :model-value="rules.cancelDeadlineMinutes"
              :options="cancelDeadlineRule.options"
              :format="cancelDeadlineRule.format"
              @update:model-value="updateRules({ cancelDeadlineMinutes: $event })"
            />
          </div>
        </SurfaceCard>
      </template>

      <div class="mt-1.5 flex items-center justify-between">
        <PanelSectionTitle>Folgas e bloqueios</PanelSectionTitle>
        <Button
          v-if="!isAddingTimeOff"
          variant="link"
          size="inline"
          @click="isAddingTimeOff = true"
        >
          <PlusIcon aria-hidden="true" />
          Adicionar
        </Button>
      </div>
      <PanelTimeOffForm
        v-if="isAddingTimeOff"
        @saved="onTimeOffSaved"
        @cancel="isAddingTimeOff = false"
      />
      <SurfaceCard v-if="timeOffItems.length" class="flex flex-col divide-y divide-border">
        <div
          v-for="item in timeOffItems"
          :key="item.id"
          class="flex items-center justify-between gap-3 py-1 pl-3.5"
        >
          <span class="flex flex-col">
            <span class="text-sm font-bold">{{ item.description }}</span>
            <span v-if="item.reason" class="text-xs text-muted-foreground">{{ item.reason }}</span>
          </span>
          <Button
            variant="ghost"
            size="icon-lg"
            :aria-label="`Remover folga: ${item.description}`"
            @click="removeTimeOff(item.id, item.description)"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      </SurfaceCard>
      <p v-else-if="!isAddingTimeOff" class="text-sm text-muted-foreground">
        Nenhuma folga marcada.
      </p>
    </div>
  </div>
</template>
