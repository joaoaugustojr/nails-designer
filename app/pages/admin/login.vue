<script setup lang="ts">
const { fetch: refreshSession } = useUserSession();
const { data: store } = await useStoreInfo();

const title = computed(() => (store.value?.name ? `${store.value.name} · Painel` : "Painel"));
useHead({ title: "Painel" });

const email = ref("");
const password = ref("");
const error = ref("");
const isPending = ref(false);

async function login() {
  error.value = "";
  isPending.value = true;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });
    await refreshSession();
    await navigateTo("/admin");
  } catch {
    error.value = "Email ou senha inválidos.";
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5">
    <div class="fixed top-4 right-4">
      <ThemeSwitch />
    </div>
    <div class="flex flex-col items-center gap-2.5 text-center">
      <StoreMark :name="store?.name ?? ''" :logo-path="store?.logoPath" />
      <h1 class="text-[22px] font-extrabold">{{ title }}</h1>
      <p class="text-sm text-muted-foreground">Entre para gerenciar sua agenda</p>
    </div>

    <form class="mt-8 flex flex-col gap-4" @submit.prevent="login">
      <FieldGroup>
        <Field :data-invalid="!!error || undefined">
          <FieldLabel for="email">Email</FieldLabel>
          <Input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
            :aria-invalid="!!error || undefined"
          />
        </Field>
        <Field :data-invalid="!!error || undefined">
          <FieldLabel for="password">Senha</FieldLabel>
          <Input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            :aria-invalid="!!error || undefined"
          />
          <FieldError v-if="error">{{ error }}</FieldError>
        </Field>
      </FieldGroup>
      <SubmitButton
        class="mt-2 w-full"
        :is-pending="isPending"
        label="Entrar"
        pending-label="Entrando…"
      />
    </form>
  </main>
</template>
