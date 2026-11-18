// Brazilian numbers, typed or stored, to "(11) 91234-5678"; anything else is left as is.
export function formatPhone(phone: string) {
  const match = /^(55)?(\d{2})(\d{4,5})(\d{4})$/.exec(phone.replace(/\D/g, ""));
  if (!match) return phone;
  const [, country, area, prefix, line] = match;
  return `${country ? "+55 " : ""}(${area}) ${prefix}-${line}`;
}

const BRAZIL_CODE = "55";
const LOCAL_DIGITS = 11;

// Formats a local number while it is typed: "(11", "(11) 9123-4", "(11) 91234-5678".
export function maskPhone(typed: string) {
  let digits = typed.replace(/\D/g, "");
  if (digits.length > LOCAL_DIGITS && digits.startsWith(BRAZIL_CODE)) digits = digits.slice(2);
  digits = digits.slice(0, LOCAL_DIGITS);
  if (digits.length <= 2) return digits && `(${digits}`;
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${area}) ${number}`;
  const prefixLength = number.length === LOCAL_DIGITS - 2 ? 5 : 4;
  return `(${area}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}

// Not wa.me: its redirect turns emoji (e.g. in the store name) into "�" in the prefilled text.
const WHATSAPP_SEND_URL = "https://api.whatsapp.com/send";

export function whatsappUrl(digits: string, message?: string) {
  const phone = digits.length <= 11 ? BRAZIL_CODE + digits : digits;
  return `${WHATSAPP_SEND_URL}?${new URLSearchParams(message ? { phone, text: message } : { phone })}`;
}

export function whatsappShareUrl(message: string) {
  return `${WHATSAPP_SEND_URL}?${new URLSearchParams({ text: message })}`;
}
