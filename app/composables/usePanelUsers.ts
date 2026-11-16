import { newUserSchema, PASSWORD_MIN_LENGTH, passwordResetSchema } from "#shared/schemas/user";

type FieldName = "name" | "email" | "password";

const FIELD_ERRORS: Record<FieldName, string> = {
  name: "Informe o nome.",
  email: "Informe um email válido.",
  password: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
};

export function usePanelUsers() {
  const { user } = useUserSession();
  const canManage = computed(() => user.value?.role === "owner");

  const { data: users, refresh } = useFetch("/api/admin/users", { default: () => [] });

  const form = reactive({ name: "", email: "", password: "" });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const error = ref("");
  const isAdding = ref(false);
  const isSaving = ref(false);

  function openForm() {
    Object.assign(form, { name: "", email: "", password: "" });
    errors.value = {};
    error.value = "";
    isAdding.value = true;
  }

  async function addUser() {
    const parsed = newUserSchema.safeParse(form);
    errors.value = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        errors.value[field] = FIELD_ERRORS[field];
      }
      return;
    }

    error.value = "";
    isSaving.value = true;
    try {
      await $fetch("/api/admin/users", { method: "POST", body: parsed.data });
      isAdding.value = false;
      await refresh();
    } catch (failure) {
      const isTaken = (failure as { statusCode?: number }).statusCode === 409;
      error.value = isTaken ? "Este email já tem acesso ao painel." : "Não foi possível cadastrar.";
    } finally {
      isSaving.value = false;
    }
  }

  async function removeUser(id: number, name: string) {
    if (!confirm(`Remover o acesso de ${name}? Ela sai do painel na hora.`)) return;
    error.value = "";
    try {
      await $fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    } catch {
      error.value = "Não foi possível remover.";
    }
    await refresh();
  }

  const resettingId = ref<number | null>(null);
  const newPassword = ref("");
  const resetError = ref("");
  const isResetting = ref(false);

  function startReset(id: number) {
    resettingId.value = id;
    newPassword.value = "";
    resetError.value = "";
  }

  function cancelReset() {
    resettingId.value = null;
  }

  async function saveReset(name: string) {
    const parsed = passwordResetSchema.safeParse({ password: newPassword.value });
    if (!parsed.success) {
      resetError.value = FIELD_ERRORS.password;
      return;
    }
    if (!confirm(`Trocar a senha de ${name}?`)) return;
    isResetting.value = true;
    try {
      await $fetch(`/api/admin/users/${resettingId.value}/password`, {
        method: "PUT",
        body: parsed.data,
      });
      resettingId.value = null;
    } catch {
      resetError.value = "Não foi possível trocar a senha.";
    } finally {
      isResetting.value = false;
    }
  }

  return {
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
    isResetting,
    startReset,
    cancelReset,
    saveReset,
  };
}
