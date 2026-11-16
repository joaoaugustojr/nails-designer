<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name: string; logoPath?: string | null; size?: "xs" | "sm" | "md" | "lg" }>(),
  { logoPath: null, size: "lg" },
);

const SIZES = {
  xs: "size-9 text-[13px]",
  sm: "size-[60px] text-[25px]",
  md: "size-16 text-[25px]",
  lg: "size-[72px] text-[28px]",
};

const letters = computed(() => initials(props.name) || "•");
</script>

<template>
  <img
    v-if="logoPath"
    :src="logoPath"
    :alt="name"
    class="shrink-0 rounded-full object-cover"
    :class="SIZES[size]"
  />
  <div
    v-else
    aria-hidden="true"
    class="flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary font-[Georgia,serif] text-primary"
    :class="SIZES[size]"
  >
    {{ letters }}
  </div>
</template>
