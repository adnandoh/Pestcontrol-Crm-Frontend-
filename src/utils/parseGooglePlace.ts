import type { City, State } from '../types';

export interface GooglePlaceSelection {
  client_address: string;
  full_address: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

function component(
  components: google.maps.places.AddressComponent[] | undefined,
  ...types: string[]
): string | undefined {
  if (!components) return undefined;
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return undefined;
}

export function parseGooglePlaceResult(
  place: google.maps.places.PlaceResult,
): GooglePlaceSelection | null {
  const formatted = place.formatted_address?.trim();
  if (!formatted) return null;

  const components = place.address_components;
  const sublocality =
    component(components, 'sublocality_level_1', 'sublocality', 'neighborhood') ?? '';
  const locality =
    component(components, 'locality', 'administrative_area_level_2', 'postal_town') ?? '';
  const state = component(components, 'administrative_area_level_1') ?? '';
  const pincode = component(components, 'postal_code') ?? '';
  const street =
    [component(components, 'premise'), component(components, 'street_number'), component(components, 'route')]
      .filter(Boolean)
      .join(', ') || '';

  const detailParts = [street, sublocality, locality].filter((p) => p && p.length > 0);
  const client_address = detailParts.length > 0 ? detailParts.join(', ') : formatted;

  const lat = place.geometry?.location?.lat?.();
  const lng = place.geometry?.location?.lng?.();

  return {
    client_address,
    full_address: formatted,
    city: locality || sublocality || undefined,
    state: state || undefined,
    pincode: pincode || undefined,
    latitude: typeof lat === 'number' ? lat : undefined,
    longitude: typeof lng === 'number' ? lng : undefined,
  };
}

export function matchMasterState(
  states: State[],
  googleState?: string,
): State | undefined {
  if (!googleState) return undefined;
  const target = normalize(googleState);
  return states.find((s) => {
    const name = normalize(s.name);
    return name === target || target.includes(name) || name.includes(target);
  });
}

export function matchMasterCity(cities: City[], googleCity?: string): City | undefined {
  if (!googleCity) return undefined;
  const target = normalize(googleCity);
  return cities.find((c) => {
    const name = normalize(c.name);
    return name === target || target.includes(name) || name.includes(target);
  });
}
