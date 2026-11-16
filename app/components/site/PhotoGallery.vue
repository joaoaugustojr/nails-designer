<script setup lang="ts">
const props = defineProps<{ photos: { id: number; path: string }[] }>();

const strip = useTemplateRef("strip");
const current = ref(0);

function onScroll() {
  if (!strip.value) return;
  current.value = Math.round(strip.value.scrollLeft / strip.value.clientWidth);
}

function show(index: number) {
  strip.value?.scrollTo({ left: index * strip.value.clientWidth, behavior: "smooth" });
}

const hasMany = computed(() => props.photos.length > 1);
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div class="relative h-60 bg-secondary">
      <div
        ref="strip"
        class="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        @scroll.passive="onScroll"
      >
        <img
          v-for="(photo, index) in photos"
          :key="photo.id"
          :src="photo.path"
          :alt="`Foto ${index + 1} de ${photos.length}`"
          class="size-full shrink-0 snap-center object-cover"
        />
      </div>
      <div v-if="hasMany" class="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        <span
          v-for="(photo, index) in photos"
          :key="photo.id"
          class="h-1.5 rounded-full transition-all"
          :class="
            index === current
              ? 'w-[18px] bg-primary'
              : 'w-1.5 bg-white shadow-[0_0_2px_rgb(0_0_0/0.5)]'
          "
        />
      </div>
    </div>

    <div v-if="hasMany" class="flex [scrollbar-width:none] gap-2 overflow-x-auto px-5">
      <button
        v-for="(photo, index) in photos"
        :key="photo.id"
        type="button"
        :aria-label="`Ver foto ${index + 1}`"
        :aria-current="index === current || undefined"
        class="h-14 w-[calc((100%-24px)/4)] shrink-0 overflow-hidden rounded-lg border-2"
        :class="index === current ? 'border-primary' : 'border-transparent'"
        @click="show(index)"
      >
        <img :src="photo.path" alt="" class="size-full object-cover" />
      </button>
    </div>
  </div>
</template>
