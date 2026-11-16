<script setup lang="ts">
import { LoaderCircleIcon } from "@lucide/vue";

defineProps<{ pending: boolean; label: string; pendingLabel: string }>();
</script>

<template>
  <Button type="submit" :disabled="pending" :aria-busy="pending">
    <LoaderCircleIcon v-if="pending" class="animate-spin" aria-hidden="true" />
    {{ pending ? pendingLabel : label }}
  </Button>
</template>
