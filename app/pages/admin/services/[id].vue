<script setup lang="ts">
const route = useRoute();
const {
  isNew,
  listPath,
  form,
  photos,
  pendingPhotos,
  errors,
  formError,
  isSaving,
  durations,
  maxPhotos,
  save,
  removePhoto,
  removeService,
} = useServiceForm(String(route.params.id));

const title = isNew ? "Novo serviço" : "Editar serviço";
useHead({ title });
</script>

<template>
  <form class="flex min-h-dvh flex-col" novalidate @submit.prevent="save">
    <PanelDetailHeader :title="title" :back-to="listPath">
      <Button
        v-if="!isNew"
        type="button"
        variant="destructive-ghost"
        size="sm"
        @click="removeService"
      >
        Excluir
      </Button>
    </PanelDetailHeader>

    <FieldGroup class="flex-1 px-5 py-4">
      <Field>
        <FieldTitle>Fotos</FieldTitle>
        <PanelServicePhotos
          v-model:pending="pendingPhotos"
          :photos="photos"
          :max="maxPhotos"
          @remove="removePhoto"
        />
      </Field>

      <Field :data-invalid="!!errors.name || undefined">
        <FieldLabel for="name">Nome</FieldLabel>
        <Input
          id="name"
          v-model="form.name"
          maxlength="80"
          :aria-invalid="!!errors.name || undefined"
        />
        <FieldError v-if="errors.name">{{ errors.name }}</FieldError>
      </Field>

      <Field :data-invalid="!!errors.details || undefined">
        <FieldLabel for="details">
          Detalhes
          <span class="font-medium text-muted-foreground">(aparece no “Saiba mais”)</span>
        </FieldLabel>
        <Textarea
          id="details"
          v-model="form.details"
          :aria-invalid="!!errors.details || undefined"
        />
        <FieldError v-if="errors.details">{{ errors.details }}</FieldError>
      </Field>

      <Field :data-invalid="!!errors.includes || undefined">
        <FieldLabel for="includes">
          O que inclui
          <span class="font-medium text-muted-foreground">(um item por linha)</span>
        </FieldLabel>
        <Textarea
          id="includes"
          v-model="form.includes"
          :aria-invalid="!!errors.includes || undefined"
        />
        <FieldError v-if="errors.includes">{{ errors.includes }}</FieldError>
      </Field>

      <div class="grid grid-cols-2 gap-3">
        <Field :data-invalid="!!errors.priceCents || undefined">
          <FieldLabel for="price">Preço (R$)</FieldLabel>
          <Input
            id="price"
            v-model="form.price"
            inputmode="decimal"
            placeholder="0,00"
            :aria-invalid="!!errors.priceCents || undefined"
          />
        </Field>
        <Field :data-invalid="!!errors.durationMinutes || undefined">
          <FieldLabel for="duration">Duração</FieldLabel>
          <NativeSelect id="duration" v-model="form.durationMinutes">
            <option v-for="minutes in durations" :key="minutes" :value="minutes">
              {{ formatDuration(minutes) }}
            </option>
          </NativeSelect>
        </Field>
      </div>
      <FieldError v-if="errors.priceCents">{{ errors.priceCents }}</FieldError>

      <Field
        orientation="horizontal"
        class="justify-between rounded-[14px] border border-border bg-card p-3.5"
      >
        <FieldLabel for="active" class="text-[15px]">Aparece no site</FieldLabel>
        <Switch id="active" v-model="form.active" />
      </Field>
    </FieldGroup>

    <footer
      class="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card px-5 pt-3.5 pb-5"
    >
      <p v-if="formError" role="alert" class="text-sm text-destructive">{{ formError }}</p>
      <Button type="submit" variant="ink" class="w-full" :disabled="isSaving">Salvar</Button>
    </footer>
  </form>
</template>
