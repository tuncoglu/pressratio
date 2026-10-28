// Optional ambient-temperature lookup, mirroring the SourDough app:
// browser geolocation -> Open-Meteo "current temperature". Open-Meteo is free,
// needs no key and allows cross-origin requests. This is the only network call
// the app makes, and only when the user asks for it (or turns on auto-detect).
// Coordinates are rounded to 2 decimals (~1 km) before they leave the device.

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEO_TIMEOUT_MS = 10_000;
export const FETCH_TIMEOUT_MS = 8_000;
/** A detected temperature older than this is not trusted when the app reopens. */
export const AUTO_TEMP_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export type DetectFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout' | 'network';
export type DetectResult = { ok: true; tempC: number; at: number } | { ok: false; reason: DetectFailure };

export interface Position {
  latitude: number;
  longitude: number;
}

export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

export function weatherUrl(lat: number, lon: number): string {
  return `${OPEN_METEO_URL}?latitude=${roundCoord(lat)}&longitude=${roundCoord(lon)}&current=temperature_2m&timezone=auto`;
}

/** Pull the temperature out of an Open-Meteo response, or null if it isn't a sensible number. */
export function parseTemp(json: unknown): number | null {
  const t = (json as { current?: { temperature_2m?: unknown } } | null)?.current?.temperature_2m;
  return typeof t === 'number' && Number.isFinite(t) && t > -90 && t < 70 ? t : null;
}

export function failureMessage(reason: DetectFailure): string {
  switch (reason) {
    case 'unsupported':
      return 'This browser cannot share a location. Enter the temperature yourself.';
    case 'denied':
      return 'Location permission was declined. Enter the temperature yourself.';
    case 'unavailable':
      return 'Your location is unavailable right now. Enter the temperature yourself.';
    case 'timeout':
      return 'Finding your location took too long. Enter the temperature yourself.';
    case 'network':
      return 'Could not reach the weather service (are you offline?). Enter the temperature yourself.';
  }
}

function browserPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject({ code: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => reject({ code: e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable' }),
      // City-level accuracy is plenty for a temperature; allow a 10-minute-old fix.
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 },
    );
  });
}

interface Deps {
  getPosition?: () => Promise<Position>;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export async function detectAmbient(deps: Deps = {}): Promise<DetectResult> {
  const getPosition = deps.getPosition ?? browserPosition;
  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ?? Date.now;

  let pos: Position;
  try {
    pos = await getPosition();
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const reason: DetectFailure =
      code === 'unsupported' || code === 'denied' || code === 'timeout' ? code : 'unavailable';
    return { ok: false, reason };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchFn(weatherUrl(pos.latitude, pos.longitude), { signal: controller.signal });
    if (!res.ok) return { ok: false, reason: 'network' };
    const tempC = parseTemp(await res.json());
    return tempC == null ? { ok: false, reason: 'network' } : { ok: true, tempC, at: now() };
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
