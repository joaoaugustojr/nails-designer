export type ServicePhoto = { id: number; path: string };

export type ServiceSummary = {
  id: number;
  name: string;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  photos: ServicePhoto[];
};
