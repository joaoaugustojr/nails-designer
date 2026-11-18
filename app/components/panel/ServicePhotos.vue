<script setup lang="ts">
import { PlusIcon, XIcon } from "@lucide/vue";
import { VueDraggable } from "vue-draggable-plus";

import type { PhotoTile } from "~/composables/useServiceForm";

const props = defineProps<{ max: number }>();
const tiles = defineModel<PhotoTile[]>("tiles", { required: true });
const emit = defineEmits<{ remove: [photoId: number] }>();

const remaining = computed(() => props.max - tiles.value.length);

function revokeIfPending(tile: PhotoTile) {
  if ("file" in tile) URL.revokeObjectURL(tile.src);
}

onBeforeUnmount(() => tiles.value.forEach(revokeIfPending));

function remove(tile: PhotoTile) {
  if ("photoId" in tile) return emit("remove", tile.photoId);
  revokeIfPending(tile);
  tiles.value = tiles.value.filter((other) => other !== tile);
}

function addFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).slice(0, remaining.value);
  const added = files.map((file) => {
    const src = URL.createObjectURL(file);
    return { key: src, src, file };
  });
  tiles.value = [...tiles.value, ...added];
  input.value = "";
}
</script>

<template>
  <VueDraggable
    v-model="tiles"
    v-bind="LONG_PRESS_SORTABLE_OPTIONS"
    draggable=".photo-tile"
    class="grid grid-cols-3 gap-2"
  >
    <div
      v-for="(tile, index) in tiles"
      :key="tile.key"
      class="photo-tile relative aspect-square overflow-hidden rounded-xl bg-secondary select-none"
    >
      <img :src="tile.src" alt="" class="pointer-events-none size-full object-cover" />
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
        @click="remove(tile)"
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
  </VueDraggable>
</template>
