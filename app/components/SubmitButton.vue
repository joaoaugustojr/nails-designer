<script setup lang="ts">
import { LoaderCircleIcon } from "@lucide/vue";

defineProps<{
  isPending: boolean;
  label: string;
  pendingLabel: string;
  size?: "default" | "md";
}>();
</script>

<template>
  <Button type="submit" :size="size" :disabled="isPending" :aria-busy="isPending">
    <LoaderCircleIcon v-if="isPending" class="animate-spin" aria-hidden="true" />
    {{ isPending ? pendingLabel : label }}
  </Button>
</template>
