<script setup lang="ts">
import { ACCENT_COLORS } from "#shared/schemas/store";

const model = defineModel<string>({ required: true });
</script>

<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 text-sm font-semibold">Cor principal</legend>
    <div class="flex flex-wrap gap-2.5">
      <label
        v-for="color in ACCENT_COLORS"
        :key="color.light"
        class="flex size-11 cursor-pointer items-center justify-center rounded-full has-checked:ring-2 has-checked:ring-(--swatch) has-focus-visible:ring-2 has-focus-visible:ring-ring"
        :style="{ '--swatch': color.light }"
      >
        <input v-model="model" type="radio" name="accent" :value="color.light" class="sr-only" />
        <span class="sr-only">{{ color.label }}</span>
        <span
          aria-hidden="true"
          class="size-9 rounded-full border-2 border-background"
          :style="{ backgroundColor: color.light }"
        />
      </label>
    </div>
  </fieldset>
</template>
