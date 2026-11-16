<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const isNotFound = computed(() => props.error.statusCode === 404);
useHead({ title: () => (isNotFound.value ? "Página não encontrada" : "Algo deu errado") });
</script>

<template>
  <main
    class="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-3 px-6 text-center"
  >
    <h1 class="text-[22px] font-extrabold">
      {{ isNotFound ? "Página não encontrada" : "Algo deu errado" }}
    </h1>
    <p class="text-sm text-muted-foreground">
      {{
        isNotFound
          ? "Este link não existe mais ou o serviço não está disponível."
          : "Tente de novo em alguns instantes."
      }}
    </p>
    <Button class="mt-3 w-full" @click="clearError({ redirect: '/' })">Ver os serviços</Button>
  </main>
</template>
