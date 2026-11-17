<script setup lang="ts">
import { LoaderCircleIcon } from "@lucide/vue";

const { current, isPending, isToggleOn, error, accept, cancel } = useConfirmDialog();

const isOpen = computed(() => current.value !== null);

function onOpenChange(open: boolean) {
  if (!open) cancel();
}
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="onOpenChange">
    <AlertDialogContent v-if="current" @escape-key-down="isPending && $event.preventDefault()">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ current.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="current.description">
          {{ current.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Field v-if="current.toggle" orientation="horizontal" class="justify-between">
        <FieldLabel for="confirm-toggle">{{ current.toggle.label }}</FieldLabel>
        <Switch id="confirm-toggle" v-model="isToggleOn" :disabled="isPending" />
      </Field>
      <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
      <AlertDialogFooter>
        <AlertDialogCancel size="md" :disabled="isPending">
          {{ current?.dismissLabel ?? "Cancelar" }}
        </AlertDialogCancel>
        <Button
          size="md"
          :variant="current.isDestructive ? 'destructive' : 'default'"
          :disabled="isPending"
          :aria-busy="isPending"
          @click="accept"
        >
          <LoaderCircleIcon v-if="isPending" class="animate-spin" aria-hidden="true" />
          {{ isPending ? current.pendingLabel : current.confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
