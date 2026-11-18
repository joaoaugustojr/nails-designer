<script setup lang="ts">
import { LoaderCircleIcon, PlusIcon, XIcon } from "@lucide/vue";
import { VueDraggable } from "vue-draggable-plus";

import { STORE_MAX_COVERS } from "#shared/schemas/store";

const props = defineProps<{
  name: string;
  logoPath: string | null;
  coverPaths: string[];
  canEdit: boolean;
  uploading: "logo" | "cover" | null;
}>();
const emit = defineEmits<{
  uploadLogo: [file: File];
  addCover: [file: File];
  removeCover: [index: number];
  reorderCovers: [paths: string[]];
}>();

const covers = ref([...props.coverPaths]);
watch(
  () => props.coverPaths,
  (paths) => (covers.value = [...paths]),
);

const canAddCover = computed(() => props.canEdit && props.coverPaths.length < STORE_MAX_COVERS);
const isUploading = computed(() => props.uploading !== null);

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
      :class="canEdit && !isUploading ? 'cursor-pointer' : 'pointer-events-none'"
    >
      <span
        class="relative flex size-[84px] items-center justify-center rounded-full border-[1.5px] border-dashed border-input"
      >
        <StoreMark :name="name" :logo-path="logoPath" size="md" />
        <span
          v-if="uploading === 'logo'"
          class="absolute inset-0 flex items-center justify-center rounded-full bg-card/80"
        >
          <LoaderCircleIcon class="size-6 animate-spin text-primary" aria-hidden="true" />
        </span>
      </span>
      <span
        v-if="canEdit"
        class="text-xs font-bold text-primary"
        :role="uploading === 'logo' ? 'status' : undefined"
      >
        {{ uploading === "logo" ? "Enviando…" : "Trocar logo" }}
      </span>
      <input
        v-if="canEdit"
        type="file"
        :accept="ACCEPTED_IMAGE_TYPES"
        :disabled="isUploading"
        class="sr-only"
        @change="pickLogo"
      />
    </label>

    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium">Fotos de capa</p>
      <VueDraggable
        v-model="covers"
        v-bind="LONG_PRESS_SORTABLE_OPTIONS"
        :disabled="!canEdit"
        draggable=".cover-tile"
        class="grid grid-cols-2 gap-2"
        @update="emit('reorderCovers', covers)"
      >
        <div
          v-for="(path, index) in covers"
          :key="path"
          class="cover-tile relative aspect-[2/1] overflow-hidden rounded-xl bg-secondary select-none"
        >
          <img :src="path" alt="" class="pointer-events-none size-full object-cover" />
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
          class="flex aspect-[2/1] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-input text-xs font-semibold text-muted-foreground"
          :class="isUploading ? 'pointer-events-none' : 'cursor-pointer'"
        >
          <template v-if="uploading === 'cover'">
            <LoaderCircleIcon class="size-5 animate-spin text-primary" aria-hidden="true" />
            <span role="status">Enviando…</span>
          </template>
          <template v-else>
            <PlusIcon :size="20" aria-hidden="true" />
            Adicionar capa
          </template>
          <input
            type="file"
            :accept="ACCEPTED_IMAGE_TYPES"
            :disabled="isUploading"
            class="sr-only"
            @change="pickCover"
          />
        </label>
      </VueDraggable>
      <p class="text-xs text-muted-foreground">
        Até {{ STORE_MAX_COVERS }} fotos. Com mais de uma, o site alterna entre elas na ordem acima;
        toque e segure uma capa para arrastá-la.
      </p>
    </div>
  </div>
</template>
