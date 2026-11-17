<script setup lang="ts">
definePageMeta({ layout: "panel" });
useHead({ title: "Loja" });

const { clear } = useUserSession();
const { canEdit, store, form, errors, error, isSaving, save, uploadLogo, addCover, removeCover } =
  useStoreSettings();

async function logout() {
  await clear();
  await navigateTo("/admin/login");
}
</script>

<template>
  <div>
    <PanelHeader title="Loja">
      <Button size="md" @click="logout">Sair</Button>
    </PanelHeader>

    <form class="flex flex-col gap-4 px-5 py-4" novalidate @submit.prevent="save">
      <p v-if="!canEdit" class="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
        Somente a dona pode alterar os dados da loja.
      </p>

      <PanelSectionTitle>Marca</PanelSectionTitle>
      <PanelBrandImages
        :name="form.storeName"
        :logo-path="store?.logoPath ?? null"
        :cover-paths="store?.coverPaths ?? []"
        :can-edit="canEdit"
        @upload-logo="uploadLogo"
        @add-cover="addCover"
        @remove-cover="removeCover"
      />

      <fieldset :disabled="!canEdit" class="flex flex-col gap-4 disabled:opacity-70">
        <PanelAccentPicker v-model="form.accentColor" />

        <FieldGroup>
          <Field :data-invalid="!!errors.storeName || undefined">
            <FieldLabel for="store-name">Nome do estúdio</FieldLabel>
            <Input
              id="store-name"
              v-model="form.storeName"
              maxlength="80"
              :aria-invalid="!!errors.storeName || undefined"
            />
            <FieldError v-if="errors.storeName">{{ errors.storeName }}</FieldError>
          </Field>

          <Field :data-invalid="!!errors.address || undefined">
            <FieldLabel for="store-address">Endereço</FieldLabel>
            <Input
              id="store-address"
              v-model="form.address"
              maxlength="200"
              placeholder="Rua, número, bairro, cidade"
              :aria-invalid="!!errors.address || undefined"
            />
            <FieldError v-if="errors.address">{{ errors.address }}</FieldError>
          </Field>

          <div class="grid grid-cols-2 gap-3">
            <Field :data-invalid="!!errors.whatsapp || undefined">
              <FieldLabel for="store-whatsapp">WhatsApp</FieldLabel>
              <Input
                id="store-whatsapp"
                v-model="form.whatsapp"
                type="tel"
                inputmode="tel"
                placeholder="(00) 00000-0000"
                :aria-invalid="!!errors.whatsapp || undefined"
              />
            </Field>
            <Field :data-invalid="!!errors.instagram || undefined">
              <FieldLabel for="store-instagram">Instagram</FieldLabel>
              <Input
                id="store-instagram"
                v-model="form.instagram"
                placeholder="@usuario"
                autocapitalize="off"
                :aria-invalid="!!errors.instagram || undefined"
              />
            </Field>
          </div>
          <FieldError v-if="errors.whatsapp">{{ errors.whatsapp }}</FieldError>
          <FieldError v-if="errors.instagram">{{ errors.instagram }}</FieldError>

          <Field :data-invalid="!!errors.about || undefined">
            <FieldLabel for="store-about">Sobre</FieldLabel>
            <Textarea
              id="store-about"
              v-model="form.about"
              maxlength="500"
              placeholder="Um texto curto que aparece no topo do site"
              :aria-invalid="!!errors.about || undefined"
            />
            <FieldError v-if="errors.about">{{ errors.about }}</FieldError>
          </Field>

          <Field :data-invalid="!!errors.thankYouMessage || undefined">
            <FieldLabel for="store-thanks">Mensagem de agradecimento</FieldLabel>
            <FieldDescription>Aparece para a cliente logo após o agendamento.</FieldDescription>
            <Textarea
              id="store-thanks"
              v-model="form.thankYouMessage"
              maxlength="300"
              :aria-invalid="!!errors.thankYouMessage || undefined"
            />
            <FieldError v-if="errors.thankYouMessage">{{ errors.thankYouMessage }}</FieldError>
          </Field>
        </FieldGroup>
      </fieldset>

      <section class="mt-2 flex flex-col gap-2">
        <PanelSectionTitle>Aparência</PanelSectionTitle>
        <p class="text-sm text-muted-foreground">
          Escolha o tema do painel neste aparelho. Não muda o site das clientes: cada pessoa escolhe
          o tema que prefere.
        </p>
        <ThemeToggle />
      </section>

      <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
      <SubmitButton
        v-if="canEdit"
        class="w-full"
        :is-pending="isSaving"
        label="Salvar informações"
        pending-label="Salvando…"
      />
    </form>

    <div class="flex flex-col gap-6 px-5 pb-6">
      <PanelAccountSection />
      <PanelUsersSection />
    </div>
  </div>
</template>
