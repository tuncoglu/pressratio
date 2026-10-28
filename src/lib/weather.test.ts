import { describe, expect, it } from 'vitest';
import { detectAmbient, parseTemp, roundCoord, weatherUrl } from './weather';

const pos = async () => ({ latitude: 51.50123, longitude: -0.12456 });
const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;

describe('weather lookup', () => {
  it('rounds coordinates to ~1 km before sending', () => {
    expect(roundCoord(51.50123)).toBe(51.5);
    expect(roundCoord(-0.12456)).toBe(-0.12);
    const url = weatherUrl(51.50123, -0.12456);
    expect(url).toContain('latitude=51.5&longitude=-0.12');
    expect(url).not.toContain('51.50123');
    expect(url).toContain('current=temperature_2m');
  });
  it('parses sensible temperatures only', () => {
    expect(parseTemp({ current: { temperature_2m: 13.6 } })).toBe(13.6);
    expect(parseTemp({ current: { temperature_2m: -4 } })).toBe(-4);
    expect(parseTemp({ current: { temperature_2m: '13' } })).toBeNull();
    expect(parseTemp({ current: { temperature_2m: 999 } })).toBeNull();
    expect(parseTemp({})).toBeNull();
    expect(parseTemp(null)).toBeNull();
  });
  it('returns the temperature and a timestamp', async () => {
    const r = await detectAmbient({
      getPosition: pos,
      fetchFn: ok({ current: { temperature_2m: 13.6 } }),
      now: () => 1000,
    });
    expect(r).toEqual({ ok: true, tempC: 13.6, at: 1000 });
  });
  it('sends only rounded coordinates to the weather service', async () => {
    let seen = '';
    await detectAmbient({
      getPosition: pos,
      fetchFn: (async (u: string) => {
        seen = u;
        return new Response(JSON.stringify({ current: { temperature_2m: 10 } }));
      }) as unknown as typeof fetch,
    });
    expect(seen).toContain('latitude=51.5&longitude=-0.12');
  });
  it('maps location failures to a reason', async () => {
    for (const code of ['denied', 'timeout', 'unsupported'] as const) {
      const r = await detectAmbient({ getPosition: async () => Promise.reject({ code }) });
      expect(r).toEqual({ ok: false, reason: code });
    }
    expect(await detectAmbient({ getPosition: async () => Promise.reject(new Error('x')) })).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
  it('maps network failures, bad status and garbage to "network"', async () => {
    const down = (async () => Promise.reject(new TypeError('offline'))) as typeof fetch;
    expect(await detectAmbient({ getPosition: pos, fetchFn: down })).toEqual({ ok: false, reason: 'network' });
    const bad = (async () => new Response('x', { status: 500 })) as typeof fetch;
    expect(await detectAmbient({ getPosition: pos, fetchFn: bad })).toEqual({ ok: false, reason: 'network' });
    expect(await detectAmbient({ getPosition: pos, fetchFn: ok({ nope: 1 }) })).toEqual({
      ok: false,
      reason: 'network',
    });
  });
});
