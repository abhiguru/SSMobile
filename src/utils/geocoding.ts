import { GOOGLE_PLACES_API_KEY } from '../constants';

export interface ParsedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

export function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  description: string,
): ParsedAddress {
  let sublocalityLevel2 = '';
  let sublocalityLevel1 = '';
  let city = '';
  let state = '';
  let pincode = '';

  for (const comp of components) {
    const types = comp.types;
    if (types.includes('sublocality_level_2')) {
      sublocalityLevel2 = comp.long_name;
    } else if (types.includes('sublocality_level_1')) {
      sublocalityLevel1 = comp.long_name;
    } else if (types.includes('locality')) {
      city = comp.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = comp.long_name;
    } else if (types.includes('postal_code')) {
      pincode = comp.long_name;
    }
  }

  let addressLine1 = '';
  if (city && description.includes(city)) {
    const cityIdx = description.indexOf(city);
    addressLine1 = description.substring(0, cityIdx).replace(/,\s*$/, '').trim();
  } else {
    const parts = description.split(',').map(p => p.trim());
    addressLine1 = parts.length > 2
      ? parts.slice(0, -2).join(', ')
      : description;
  }

  const line2Candidates = [sublocalityLevel2, sublocalityLevel1].filter(Boolean);
  const line2Parts = line2Candidates.filter(part => !addressLine1.includes(part));
  let addressLine2 = line2Parts.join(', ');

  // Auto-split long addressLine1 at a comma boundary (~60 chars)
  const MAX_LINE1 = 60;
  if (addressLine1.length > MAX_LINE1) {
    const commaIdx = addressLine1.lastIndexOf(',', MAX_LINE1);
    if (commaIdx > 0) {
      const overflow = addressLine1.substring(commaIdx + 1).trim();
      addressLine1 = addressLine1.substring(0, commaIdx).trim();
      addressLine2 = overflow + (addressLine2 ? ', ' + addressLine2 : '');
    }
  }

  return { addressLine1, addressLine2, city, state, pincode };
}

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function reverseGeocodeGoogle(
  lat: number,
  lng: number,
): Promise<(ParsedAddress & { formattedAddress: string }) | null> {
  try {
    const url = `${GEOCODE_URL}?${new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: GOOGLE_PLACES_API_KEY,
    })}`;

    console.log('[Geocoding] request:', url.replace(GOOGLE_PLACES_API_KEY, 'KEY_REDACTED'));
    const res = await fetch(url);
    const data = await res.json();
    console.log('[Geocoding] response status=%s results=%s error=%s', data.status, data.results?.length ?? 0, data.error_message ?? 'none');

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0];
      const parsed = parseAddressComponents(
        result.address_components || [],
        result.formatted_address || '',
      );
      return {
        ...parsed,
        formattedAddress: result.formatted_address || '',
      };
    }
    return null;
  } catch (err) {
    console.error('[Geocoding] fetch error:', err instanceof Error ? err.message : err);
    return null;
  }
}
