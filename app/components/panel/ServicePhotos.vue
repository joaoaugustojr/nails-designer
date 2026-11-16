<script setup lang="ts">
import { PlusIcon, XIcon } from "@lucide/vue";

import type { ApiGet } from "~/types/api";

const props = defineProps<{
  photos: ApiGet<"/api/admin/services/:id">["photos"];
  max: number;
}>();
const pending = defineModel<File[]>("pending", { required: true });
const emit = defineEmits<{ remove: [photoId: number] }>();

const pendingUrls = computed(() => pending.value.map((file) => URL.createObjectURL(file)));
watch(pendingUrls, (_, previous) => previous?.forEach((url) => URL.revokeObjectURL(url)));
onBeforeUnmount(() => pendingUrls.value.forEach((url) => URL.revokeObjectURL(url)));

const tiles = computed(() => [
  ...props.photos.map((photo) => ({
    key: `photo-${photo.id}`,
    src: photo.path,
    remove: () => emit("remove", photo.id),
  })),
  ...pendingUrls.value.map((url, index) => ({
    key: url,
    src: url,
    remove: () => removePending(index),
  })),
]);

const remaining = computed(() => props.max - tiles.value.length);

function removePending(index: number) {
  pending.value = pending.value.filter((_, position) => position !== index);
}

function addFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).slice(0, remaining.value);
  pending.value = [...pending.value, ...files];
  input.value = "";
}
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <div
      v-for="(tile, index) in tiles"
      :key="tile.key"
      class="relative aspect-square overflow-hidden rounded-xl bg-secondary"
    >
      <img :src="tile.src" alt="" class="size-full object-cover" />
      <span
        v-if="index === 0"
        class="absolute bottom-1.5 left-1.5 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background"
      >
        CAPA
      </span>
      <button
        type="button"
        aria-label="Remover foto"
        class="absolute top-0 right-0 flex size-11 items-center justify-center"
        @click="tile.remove"
      >
        <span
          class="flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground"
        >
          <XIcon :size="16" aria-hidden="true" />
        </span>
      </button>
    </div>
    <label
      v-if="remaining > 0"
      class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-input text-xs font-semibold text-muted-foreground"
    >
      <PlusIcon :size="20" aria-hidden="true" />
      Adicionar
      <input
        type="file"
        :accept="ACCEPTED_IMAGE_TYPES"
        multiple
        class="sr-only"
        @change="addFiles"
      />
    </label>
  </div>
</template>
