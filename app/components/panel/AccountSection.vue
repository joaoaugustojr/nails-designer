<script setup lang="ts">
const {
  user,
  name,
  nameError,
  isSavingName,
  hasNameChanged,
  saveName,
  isChangingPassword,
  passwords,
  passwordError,
  isSavingPassword,
  openPasswordForm,
  savePassword,
} = useAccount();
</script>

<template>
  <section class="flex flex-col gap-3">
    <PanelSectionTitle>Minha conta</PanelSectionTitle>

    <form
      class="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5"
      novalidate
      @submit.prevent="saveName"
    >
      <Field :data-invalid="!!nameError || undefined">
        <FieldLabel for="account-name">Seu nome</FieldLabel>
        <Input
          id="account-name"
          v-model="name"
          maxlength="80"
          autocomplete="name"
          :aria-invalid="!!nameError || undefined"
        />
        <FieldDescription>Você entra com {{ user?.email }}</FieldDescription>
        <FieldError v-if="nameError">{{ nameError }}</FieldError>
      </Field>
      <SubmitButton
        v-if="hasNameChanged"
        size="md"
        class="self-end"
        :pending="isSavingName"
        label="Salvar nome"
        pending-label="Salvando…"
      />
    </form>

    <Button
      v-if="!isChangingPassword"
      variant="outline"
      size="md"
      class="self-start"
      @click="openPasswordForm"
    >
      Alterar senha
    </Button>

    <form
      v-else
      class="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5"
      novalidate
      @submit.prevent="savePassword"
    >
      <FieldGroup>
        <Field>
          <FieldLabel for="current-password">Senha atual</FieldLabel>
          <Input
            id="current-password"
            v-model="passwords.current"
            type="password"
            autocomplete="current-password"
          />
        </Field>
        <Field>
          <FieldLabel for="new-password">Nova senha</FieldLabel>
          <Input
            id="new-password"
            v-model="passwords.next"
            type="password"
            autocomplete="new-password"
          />
        </Field>
        <Field>
          <FieldLabel for="confirm-password">Confirme a nova senha</FieldLabel>
          <Input
            id="confirm-password"
            v-model="passwords.confirmation"
            type="password"
            autocomplete="new-password"
          />
          <FieldDescription>
            Ao trocar, os outros aparelhos conectados saem do painel.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <p v-if="passwordError" role="alert" class="text-sm text-destructive">{{ passwordError }}</p>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          class="flex-1"
          @click="isChangingPassword = false"
        >
          Cancelar
        </Button>
        <SubmitButton
          size="md"
          class="flex-1"
          :pending="isSavingPassword"
          label="Salvar senha"
          pending-label="Salvando…"
        />
      </div>
    </form>
  </section>
</template>
