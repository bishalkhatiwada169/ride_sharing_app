/**
 * MAP-3 destination search.
 *
 * Backend has no Places/MapGateway yet (docs: MapGateway port only).
 * We use Photon (Komoot) — OSM-based search suitable for autocomplete,
 * biased to Kathmandu. No API key required. Attribution: OSM + Photon.
 *
 * When the platform adds a backend proxy, swap this module only.
 */

export type PlaceResult = {
  id: string;
  name: string;
  secondary: string;
  latitude: number;
  longitude: number;
};

type PhotonFeature = {
  geometry?: {coordinates?: [number, number]};
  properties?: {
    osm_id?: number | string;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    type?: string;
  };
};

type PhotonResponse = {features?: PhotonFeature[]};

const KATHMANDU = {lat: 27.7172, lon: 85.324};
const PHOTON_URL = 'https://photon.komoot.io/api/';

function secondaryLine(p: PhotonFeature['properties']): string {
  if (!p) {
    return '';
  }
  const parts = [
    [p.housenumber, p.street].filter(Boolean).join(' '),
    p.district,
    p.city || p.county,
    p.state,
  ].filter(Boolean);
  return parts.join(', ') || p.country || '';
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  near?: {latitude: number; longitude: number} | null,
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const lat = near?.latitude ?? KATHMANDU.lat;
  const lon = near?.longitude ?? KATHMANDU.lon;
  const url =
    `${PHOTON_URL}?q=${encodeURIComponent(q)}` +
    `&lat=${lat}&lon=${lon}&limit=8&lang=en`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RidePassengerApp/1.0 (Kathmandu; MAP-3 Photon)',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error('SEARCH_FAILED');
  }

  const data = (await res.json()) as PhotonResponse;
  const out: PlaceResult[] = [];
  const seen = new Set<string>();

  for (const f of data.features ?? []) {
    const coords = f.geometry?.coordinates;
    const name = f.properties?.name?.trim();
    if (!coords || coords.length < 2 || !name) {
      continue;
    }
    const [lng, latVal] = coords;
    const id = `${f.properties?.osm_type ?? 'p'}-${f.properties?.osm_id ?? `${latVal},${lng}`}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      name,
      secondary: secondaryLine(f.properties),
      latitude: latVal,
      longitude: lng,
    });
  }

  return out;
}
