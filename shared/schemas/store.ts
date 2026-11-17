import { z } from "zod";

// `light` is what is stored (settings.accent_color); `dark` is its counterpart for the dark theme.
export const ACCENT_COLORS = [
  { light: "#a8325a", dark: "#e9b9c8", label: "Rosé" },
  { light: "#7a2840", dark: "#e3a6b8", label: "Vinho" },
  { light: "#8f5a4b", dark: "#e8c2b4", label: "Nude" },
  { light: "#6b4e9b", dark: "#cbb8ec", label: "Lavanda" },
  { light: "#3a3539", dark: "#d9d2d5", label: "Grafite" },
] as const;

export const DEFAULT_ACCENT = ACCENT_COLORS[0];

const accentValues = ACCENT_COLORS.map((color) => color.light) as [string, ...string[]];

const optionalText = (max: number) => z.string().trim().max(max);

export const storeSchema = z.object({
  storeName: z.string().trim().min(1).max(80),
  accentColor: z.enum(accentValues),
  address: optionalText(200),
  whatsapp: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => digits === "" || (digits.length >= 10 && digits.length <= 13)),
  instagram: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ""))
    .refine((handle) => handle === "" || /^[\w.]{1,30}$/.test(handle)),
  about: optionalText(500),
  thankYouMessage: optionalText(300),
});

export const STORE_MAX_COVERS = 4;

export type StoreInput = z.infer<typeof storeSchema>;
