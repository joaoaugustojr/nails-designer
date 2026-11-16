<script setup lang="ts">
// The store's logo, or its initials in a ring while no logo is uploaded.
const props = defineProps<{ name: string; logoPath?: string | null }>();

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
  <img v-if="logoPath" :src="logoPath" :alt="name" class="size-[72px] rounded-full object-cover" />
  <div
    v-else
    aria-hidden="true"
    class="flex size-[72px] items-center justify-center rounded-full border-[1.5px] border-primary font-[Georgia,serif] text-[28px] text-primary"
  >
    {{ initials }}
  </div>
</template>
