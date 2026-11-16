<script setup lang="ts">
const { fetch: refreshSession } = useUserSession();
const { data: store } = await useFetch("/api/store");

const title = computed(() => (store.value?.name ? `${store.value.name} · Painel` : "Painel"));
useHead({ title });

const email = ref("");
const password = ref("");
const error = ref("");
const pending = ref(false);

async function login() {
  error.value = "";
  pending.value = true;
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
    pending.value = false;
  }
}
</script>

<!-- Mockup: "Painel · Login". -->
<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
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
      <Button type="submit" variant="ink" class="mt-2 w-full" :disabled="pending">Entrar</Button>
    </form>
  </main>
</template>
