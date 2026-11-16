<script setup lang="ts">
import type { StoreImageKind } from "#shared/schemas/store";

defineProps<{
  name: string;
  logoPath: string | null;
  coverPath: string | null;
  canEdit: boolean;
}>();
const emit = defineEmits<{ upload: [kind: StoreImageKind, file: File] }>();

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

function pick(kind: StoreImageKind, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) emit("upload", kind, file);
}
</script>

<template>
  <div class="flex gap-3">
    <label
      class="flex flex-col items-center gap-1.5"
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
        :accept="ACCEPTED_TYPES"
        class="sr-only"
        @change="pick('logo', $event)"
      />
    </label>

    <label
      class="flex flex-1 flex-col gap-1.5"
      :class="canEdit ? 'cursor-pointer' : 'pointer-events-none'"
    >
      <span
        class="flex h-[84px] items-center justify-center overflow-hidden rounded-xl bg-secondary text-xs font-bold text-muted-foreground"
      >
        <img v-if="coverPath" :src="coverPath" alt="" class="size-full object-cover" />
        <template v-else>FOTO DE CAPA</template>
      </span>
      <span v-if="canEdit" class="text-center text-xs font-bold text-primary">Trocar capa</span>
      <input
        v-if="canEdit"
        type="file"
        :accept="ACCEPTED_TYPES"
        class="sr-only"
        @change="pick('cover', $event)"
      />
    </label>
  </div>
</template>
