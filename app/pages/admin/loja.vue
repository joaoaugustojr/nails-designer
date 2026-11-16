<script setup lang="ts">
definePageMeta({ layout: "panel" });
useHead({ title: "Loja" });

const { clear } = useUserSession();

async function logout() {
  await clear();
  await navigateTo("/admin/login");
}
</script>

<!-- Store, brand and users land in phase 2, steps 4 and 6. -->
<template>
  <PanelHeader title="Loja">
    <button
      type="button"
      class="text-sm font-bold text-muted-foreground hover:text-foreground"
      @click="logout"
    >
      Sair
    </button>
  </PanelHeader>
</template>
