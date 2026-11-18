<script setup lang="ts">
import { NAME_MAX_LENGTH } from "#shared/schemas/fields";

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

    <SurfaceCard as="form" class="flex flex-col gap-3 p-3.5" novalidate @submit.prevent="saveName">
      <Field :data-invalid="!!nameError || undefined">
        <FieldLabel for="account-name">Seu nome</FieldLabel>
        <Input
          id="account-name"
          v-model="name"
          :maxlength="NAME_MAX_LENGTH"
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
        :is-pending="isSavingName"
        label="Salvar nome"
        pending-label="Salvando…"
      />
    </SurfaceCard>

    <Button
      v-if="!isChangingPassword"
      variant="outline"
      size="md"
      class="self-start"
      @click="openPasswordForm"
    >
      Alterar senha
    </Button>

    <SurfaceCard
      v-else
      as="form"
      class="flex flex-col gap-3 p-3.5"
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
          :is-pending="isSavingPassword"
          label="Salvar senha"
          pending-label="Salvando…"
        />
      </div>
    </SurfaceCard>
  </section>
</template>
