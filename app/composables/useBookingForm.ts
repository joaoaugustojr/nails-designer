import { bookingSchema } from "#shared/schemas/booking";

type FieldName = "name" | "phone";

const FIELD_ERRORS: Record<FieldName, string> = {
  name: CLIENT_NAME_ERROR,
  phone: PHONE_ERROR,
};

const REQUEST_ERRORS: Record<number, string> = {
  409: "Esse horário acabou de ser reservado. Escolha outro.",
  429: TOO_MANY_ATTEMPTS_ERROR,
};

function newIdempotencyKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useBookingForm(choice: { serviceId: number; date: string; startMinute: number }) {
  const form = reactive({ name: "", phone: "", remindersOptIn: true, website: "" });
  const errors = ref<Partial<Record<FieldName, string>>>({});
  const error = ref("");
  const isSlotTaken = ref(false);
  const isSaving = ref(false);
  let idempotencyKey: string | null = null;

  function formatPhoneField() {
    form.phone = formatPhone(form.phone);
  }

  async function confirm() {
    idempotencyKey ??= newIdempotencyKey();
    const parsed = bookingSchema.safeParse({ ...choice, ...form, idempotencyKey });
    errors.value = parsed.success ? {} : fieldMessages(parsed.error, FIELD_ERRORS);
    if (!parsed.success) return;

    error.value = "";
    isSaving.value = true;
    try {
      const { token } = await $fetch("/api/bookings", { method: "POST", body: parsed.data });
      await navigateTo(`/bookings/${token}/confirmed`, { replace: true });
    } catch (failure) {
      const status = errorStatus(failure);
      isSlotTaken.value = status === 409;
      error.value = REQUEST_ERRORS[status ?? 0] ?? "Não foi possível agendar. Tente de novo.";
    } finally {
      isSaving.value = false;
    }
  }

  return { form, errors, error, isSlotTaken, isSaving, formatPhoneField, confirm };
}
