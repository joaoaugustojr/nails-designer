<script setup lang="ts">
definePageMeta({ layout: "panel" });
useHead({ title: "Loja" });

const { clear } = useUserSession();

async function logout() {
  await clear();
  await navigateTo("/admin/login");
}
</script>

<template>
  <div>
    <PanelHeader title="Loja">
      <button
        type="button"
        class="text-sm font-bold text-muted-foreground hover:text-foreground"
        @click="logout"
      >
        Sair
      </button>
    </PanelHeader>

    <section class="flex flex-col gap-2 p-5">
      <h2 class="text-[13px] font-bold tracking-wide text-muted-foreground uppercase">Aparência</h2>
      <ThemeToggle />
    </section>
  </div>
</template>
