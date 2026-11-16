const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(cents: number) {
  return currency.format(cents / 100);
}

export function formatPriceShort(cents: number) {
  const digits = cents % 100 ? 2 : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
}

export function centsToPriceInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

// Accepts what people type in Brazil: "45", "45,5", "1.234,56", "R$ 45,00" (and "45.50").
export function parsePrice(input: string): number | null {
  const compact = input.replace(/R\$|\s/g, "");
  const decimal = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  if (!/^\d+(\.\d{1,2})?$/.test(decimal)) return null;
  return Math.round(Number(decimal) * 100);
}
