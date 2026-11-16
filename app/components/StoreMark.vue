<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name: string; logoPath?: string | null; size?: "md" | "lg" }>(),
  { logoPath: null, size: "lg" },
);

const SIZES = { md: "size-16 text-[25px]", lg: "size-[72px] text-[28px]" };

const initials = computed(
  () =>
    props.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join("") || "•",
);
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
    {{ initials }}
  </div>
</template>
