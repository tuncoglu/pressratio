import { describe, expect, it } from 'vitest';
import { exportJson, mergeBatches, parseImport, sanitizeBatch } from './storage';
import type { Batch } from './calc/types';

const batch = (id: string, createdAt: string): Batch => ({
  id,
  createdAt,
  mode: 'extruded',
  machine: 'manual',
  die: 'Bucatini',
  blend: { type00: 0, fineSemolina: 0, coarseSemolina: 100, breadFlour: 0 },
  eggShelledG: 210,
  yolkG: 0,
  addedWaterG: 0,
  lyeWaterG: 0,
  ambientC: 21,
  flourTotalG: 525,
  hydration: 0.3,
  restMinMin: 30,
  restMaxMin: 40,
  extraWaterG: 5,
  extraSemolinaG: 0,
  rating: 3,
  notes: 'ok',
});

describe('export / import', () => {
  it('round-trips batches', () => {
    const batches = [batch('a', '2026-10-01T10:00:00.000Z'), batch('b', '2026-10-02T10:00:00.000Z')];
    const r = parseImport(exportJson({ unit: 'g', batches }));
    expect(r).toEqual({ ok: true, batches, skipped: 0 });
  });
  it('fills fields missing from older exports with defaults', () => {
    const { yolkG: _y, extraSemolinaG: _s, ...old } = batch('a', '2026-10-01T10:00:00.000Z');
    const b = sanitizeBatch(old)!;
    expect(b.yolkG).toBe(0);
    expect(b.extraSemolinaG).toBe(0);
  });
  it('keeps valid flour choices and press model, drops unknown ones', () => {
    const b = sanitizeBatch({
      ...batch('a', '2026-10-01T10:00:00.000Z'),
      flours: { coarseSemolina: 'shipton-507', type00: 'shipton-507', breadFlour: 'nope' },
      pressModel: '8',
    })!;
    expect(b.flours).toEqual({ coarseSemolina: 'shipton-507' });
    expect(b.pressModel).toBe('8');
    expect(sanitizeBatch({ ...batch('a', '2026-10-01T10:00:00.000Z'), pressModel: '9' })!.pressModel).toBeUndefined();
  });
  it('rejects non-JSON and foreign JSON', () => {
    expect(parseImport('nope').ok).toBe(false);
    expect(parseImport('{"batches":[]}').ok).toBe(false);
  });
  it('skips malformed batches but keeps good ones', () => {
    const text = JSON.stringify({ app: 'pressratio', batches: [batch('a', '2026-10-01T10:00:00.000Z'), { id: 'bad' }, null] });
    const r = parseImport(text);
    expect(r.ok && r.batches.length).toBe(1);
    expect(r.ok && r.skipped).toBe(2);
  });
  it('clamps ratings and rejects blends that do not sum to 100', () => {
    expect(sanitizeBatch({ ...batch('a', '2026-10-01T10:00:00.000Z'), rating: 9 })?.rating).toBe(5);
    expect(sanitizeBatch({ ...batch('a', '2026-10-01T10:00:00.000Z'), blend: { type00: 10 } })).toBeNull();
  });
  it('merges by id, imported wins, newest first', () => {
    const old = batch('a', '2026-10-01T10:00:00.000Z');
    const edited = { ...old, notes: 'edited' };
    const other = batch('b', '2026-10-05T10:00:00.000Z');
    const merged = mergeBatches([old], [other, edited]);
    expect(merged.map((b) => b.id)).toEqual(['b', 'a']);
    expect(merged[1].notes).toBe('edited');
  });
});
