<!-- Placeholder until the panel screens land in phase 2. -->
<script setup lang="ts">
const { user, clear } = useUserSession();

async function logout() {
  await clear();
  await navigateTo("/admin/login");
}
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
    <h1 class="text-2xl font-extrabold">Olá, {{ user?.name }}</h1>
    <Button variant="outline" @click="logout">Sair</Button>
  </main>
</template>
