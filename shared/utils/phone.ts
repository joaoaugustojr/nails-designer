// Brazilian numbers, typed or stored, to "(11) 91234-5678"; anything else is left as is.
export function formatPhone(phone: string) {
  const match = /^(55)?(\d{2})(\d{4,5})(\d{4})$/.exec(phone.replace(/\D/g, ""));
  if (!match) return phone;
  const [, country, area, prefix, line] = match;
  return `${country ? "+55 " : ""}(${area}) ${prefix}-${line}`;
}

const BRAZIL_CODE = "55";

export function whatsappUrl(digits: string, message?: string) {
  const international = digits.length <= 11 ? BRAZIL_CODE + digits : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${international}${text}`;
}
