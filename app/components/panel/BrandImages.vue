<script setup lang="ts">
import { PlusIcon, XIcon } from "@lucide/vue";

import { STORE_MAX_COVERS } from "#shared/schemas/store";

const props = defineProps<{
  name: string;
  logoPath: string | null;
  coverPaths: string[];
  canEdit: boolean;
}>();
const emit = defineEmits<{
  uploadLogo: [file: File];
  addCover: [file: File];
  removeCover: [index: number];
}>();

const canAddCover = computed(() => props.canEdit && props.coverPaths.length < STORE_MAX_COVERS);

function takeFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  return file;
}

function pickLogo(event: Event) {
  const file = takeFile(event);
  if (file) emit("uploadLogo", file);
}

function pickCover(event: Event) {
  const file = takeFile(event);
  if (file) emit("addCover", file);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <label
      class="flex items-center gap-3 self-start"
      :class="canEdit ? 'cursor-pointer' : 'pointer-events-none'"
    >
      <span
        class="flex size-[84px] items-center justify-center rounded-full border-[1.5px] border-dashed border-input"
      >
        <StoreMark :name="name" :logo-path="logoPath" size="md" />
      </span>
      <span v-if="canEdit" class="text-xs font-bold text-primary">Trocar logo</span>
      <input
        v-if="canEdit"
        type="file"
        :accept="ACCEPTED_IMAGE_TYPES"
        class="sr-only"
        @change="pickLogo"
      />
    </label>

    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium">Fotos de capa</p>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="(path, index) in coverPaths"
          :key="path"
          class="relative aspect-[2/1] overflow-hidden rounded-xl bg-secondary"
        >
          <img :src="path" alt="" class="size-full object-cover" />
          <button
            v-if="canEdit"
            type="button"
            aria-label="Remover capa"
            class="absolute top-0 right-0 flex size-11 items-center justify-center"
            @click="emit('removeCover', index)"
          >
            <span
              class="flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground"
            >
              <XIcon :size="16" aria-hidden="true" />
            </span>
          </button>
        </div>
        <label
          v-if="canAddCover"
          class="flex aspect-[2/1] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-input text-xs font-semibold text-muted-foreground"
        >
          <PlusIcon :size="20" aria-hidden="true" />
          Adicionar capa
          <input type="file" :accept="ACCEPTED_IMAGE_TYPES" class="sr-only" @change="pickCover" />
        </label>
      </div>
      <p class="text-xs text-muted-foreground">
        Até {{ STORE_MAX_COVERS }} fotos. Com mais de uma, o site alterna entre elas.
      </p>
    </div>
  </div>
</template>
