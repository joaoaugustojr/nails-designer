type Place = { address: string | null; mapLocation: string | null };

// The exact point when the owner set one; otherwise Google searches the address text.
const destination = ({ address, mapLocation }: Place) => mapLocation ?? address;

export function mapUrl(place: Place) {
  const query = destination(place);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

export function directionsUrl(place: Place) {
  const query = destination(place);
  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
    : null;
}
