<script setup lang="ts">
import { PlusIcon } from "@lucide/vue";

const {
  canManage,
  users,
  form,
  errors,
  error,
  isAdding,
  isSaving,
  openForm,
  addUser,
  removeUser,
  resettingId,
  newPassword,
  resetError,
  startReset,
  cancelReset,
  saveReset,
} = usePanelUsers();
</script>

<template>
  <section class="flex flex-col gap-2.5">
    <div class="flex items-center justify-between">
      <PanelSectionTitle>Quem acessa o painel</PanelSectionTitle>
      <Button v-if="canManage && !isAdding" variant="link" size="inline" @click="openForm">
        <PlusIcon aria-hidden="true" />
        Cadastrar
      </Button>
    </div>

    <PanelCard
      v-if="isAdding"
      as="form"
      class="flex flex-col gap-3 p-3.5"
      novalidate
      @submit.prevent="addUser"
    >
      <FieldGroup>
        <Field :data-invalid="!!errors.name || undefined">
          <FieldLabel for="user-name">Nome</FieldLabel>
          <Input id="user-name" v-model="form.name" :aria-invalid="!!errors.name || undefined" />
          <FieldError v-if="errors.name">{{ errors.name }}</FieldError>
        </Field>
        <Field :data-invalid="!!errors.email || undefined">
          <FieldLabel for="user-email">Email</FieldLabel>
          <Input
            id="user-email"
            v-model="form.email"
            type="email"
            autocomplete="off"
            :aria-invalid="!!errors.email || undefined"
          />
          <FieldError v-if="errors.email">{{ errors.email }}</FieldError>
        </Field>
        <Field :data-invalid="!!errors.password || undefined">
          <FieldLabel for="user-password">Senha</FieldLabel>
          <Input
            id="user-password"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            :aria-invalid="!!errors.password || undefined"
          />
          <FieldDescription>
            Passe a senha para a pessoa; ela entra com o email e essa senha.
          </FieldDescription>
          <FieldError v-if="errors.password">{{ errors.password }}</FieldError>
        </Field>
      </FieldGroup>
      <div class="flex gap-2">
        <Button type="button" variant="outline" size="md" class="flex-1" @click="isAdding = false">
          Cancelar
        </Button>
        <SubmitButton
          size="md"
          class="flex-1"
          :is-pending="isSaving"
          label="Cadastrar"
          pending-label="Cadastrando…"
        />
      </div>
    </PanelCard>

    <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>

    <PanelCard as="ul" class="flex flex-col divide-y divide-border">
      <li v-for="user in users" :key="user.id" class="flex flex-col gap-2 px-3.5 py-2.5">
        <div class="flex items-center gap-2.5">
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-sm font-bold">{{ user.name }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ user.email }}</span>
          </span>
          <Badge v-if="user.role === 'owner'" variant="secondary">Dona</Badge>
        </div>

        <div
          v-if="canManage && user.role !== 'owner' && resettingId !== user.id"
          class="flex gap-4"
        >
          <Button variant="link" size="inline" @click="startReset(user.id)">Redefinir senha</Button>
          <Button variant="quiet" size="inline" @click="removeUser(user.id, user.name)">
            Remover
          </Button>
        </div>

        <form
          v-if="resettingId === user.id"
          class="flex flex-col gap-2"
          novalidate
          @submit.prevent="saveReset(user.name)"
        >
          <Field :data-invalid="!!resetError || undefined">
            <FieldLabel :for="`reset-${user.id}`">Nova senha para {{ user.name }}</FieldLabel>
            <Input
              :id="`reset-${user.id}`"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              :aria-invalid="!!resetError || undefined"
            />
            <FieldDescription>
              Passe a nova senha para a pessoa. Quem estiver conectado com esta conta sai do painel.
            </FieldDescription>
            <FieldError v-if="resetError">{{ resetError }}</FieldError>
          </Field>
          <div class="flex gap-2">
            <Button type="button" variant="outline" size="md" class="flex-1" @click="cancelReset">
              Cancelar
            </Button>
            <Button type="submit" size="md" class="flex-1">Salvar senha</Button>
          </div>
        </form>
      </li>
    </PanelCard>
  </section>
</template>
