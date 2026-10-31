import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { BLEND_PRESETS, calculate, describeDelta, deltaVsPrevious, restPlan, squeezeAdvice } from '../calc/calc';
import type { Batch, CalcInput, Mode } from '../calc/types';
import { BatchLog } from '../components/BatchLog';
import { Calculator } from '../components/Calculator';
import { DEFAULT_FORM } from '../storage';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { LOCALES, detectLocale, n, pct, setLocale, t, tp, tx, type Locale, type Msg } from './index';
import { it as itDict } from './it';
import { tr } from './tr';

const DICTS: Record<Exclude<Locale, 'en'>, Record<string, string>> = { tr, de, es, fr, it: itDict };
const NON_EN = Object.keys(DICTS) as Exclude<Locale, 'en'>[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setLocale('en'));

describe('dictionaries', () => {
  it('define exactly the English keys', () => {
    const keys = Object.keys(en).sort();
    for (const l of NON_EN) expect(Object.keys(DICTS[l]).sort(), l).toEqual(keys);
  });

  it('use the same {placeholders} as English for every key', () => {
    for (const l of NON_EN) {
      for (const [k, v] of Object.entries(en)) {
        expect(placeholders(DICTS[l][k]), `${l}:${k}`).toEqual(placeholders(v));
      }
    }
  });

  it('have no empty strings', () => {
    for (const l of NON_EN) for (const [k, v] of Object.entries(DICTS[l])) expect(v.trim(), `${l}:${k}`).not.toBe('');
  });

  it('actually translate: most long strings differ from English', () => {
    for (const l of NON_EN) {
      const long = Object.entries(en).filter(([, v]) => v.length > 60);
      const same = long.filter(([k, v]) => DICTS[l][k] === v);
      expect(same.length, `${l} left ${same.map(([k]) => k).join(', ')} in English`).toBe(0);
    }
  });
});

describe('formatting', () => {
  it('writes decimals and percents the local way', () => {
    expect(n(37.5)).toBe('37.5');
    expect(pct(37.5)).toBe('37.5 %');
    setLocale('de');
    expect(n(37.5)).toBe('37,5');
    expect(pct(37.5)).toBe('37,5 %');
    setLocale('tr');
    expect(pct(37.5)).toBe('%37,5');
    setLocale('it');
    expect(pct(37.5)).toBe('37,5%');
    setLocale('fr');
    expect(t('res.restTime', { a: 30, b: 40 })).toBe('30–40 min');
  });

  it('picks plural forms', () => {
    expect(tp('log.exported', 1)).toBe('Exported 1 batch.');
    expect(tp('log.exported', 3)).toBe('Exported 3 batches.');
    setLocale('de');
    expect(tp('log.exported', 1)).toBe('1 Ansatz exportiert.');
    expect(tp('log.exported', 2)).toBe('2 Ansätze exportiert.');
    setLocale('tr');
    expect(tp('log.exported', 2)).toBe('2 parti dışa aktarıldı.');
  });

  it('detects the browser language, defaulting to English', () => {
    expect(detectLocale(['tr-TR', 'en'])).toBe('tr');
    expect(detectLocale(['fr-CA'])).toBe('fr');
    expect(detectLocale(['pt-BR', 'de'])).toBe('de');
    expect(detectLocale(['ja'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});

const alk: CalcInput = {
  mode: 'alkaline', egg: { kind: 'shelled', value: 175 }, yolkG: 20, addedWaterG: 0, lyeWaterG: 0,
  blend: BLEND_PRESETS[1].blend, machine: 'manual', ambientC: 35,
};

/** Every message an engine result carries, so a missing parameter shows up as a leftover {x}. */
function allMessages(): Msg[] {
  const out: Msg[] = [];
  for (const mode of ['extruded', 'alkaline', 'rolled'] as Mode[]) {
    for (const lyeWaterG of [0, 2]) {
      for (const ambientC of [10, 20, 35]) {
        const r = calculate({ ...alk, mode, lyeWaterG, ambientC, machine: mode === 'rolled' ? 'pin' : 'manual' });
        out.push(...r.warnings.map((w) => w.text), ...r.rest.notes, ...r.ingredients.flatMap((i) => (i.note ? [i.note, i.label] : [i.label])));
        if (r.textureTarget) out.push(r.textureTarget);
      }
    }
    out.push(restPlan(alk.blend, 33, mode).notes[2]);
    for (const s of ['crumbly', 'powdery', 'sticky'] as const) {
      const a = squeezeAdvice(s, 500, mode);
      out.push(a.title, a.action);
    }
  }
  out.push(calculate({ ...alk, blend: { ...alk.blend, type00: 1 } }).message!);
  out.push(calculate({ ...alk, egg: { kind: 'shelled', value: 0 }, yolkG: 0 }).message!);
  out.push(calculate({ ...alk, mode: 'extruded', egg: { kind: 'shelled', value: 0 }, yolkG: 0 }).message!);
  return out;
}

describe('engine messages in every language', () => {
  it('fill every parameter and leave no stray braces or "undefined"', () => {
    const msgs = allMessages();
    expect(msgs.length).toBeGreaterThan(40);
    for (const l of LOCALES) {
      setLocale(l.id);
      for (const msg of msgs) {
        const text = tx(msg);
        expect(text, `${l.id}:${msg.k}`).not.toMatch(/[{}]|undefined|NaN/);
      }
    }
  });

  it('describes batch comparisons without leftovers', () => {
    const mk = (id: string, at: string, extra: number, rating: number | null): Batch => ({
      id, createdAt: at, mode: 'extruded', machine: 'manual', die: 'Spaghetti', blend: DEFAULT_FORM.blend,
      eggShelledG: 210, yolkG: 0, addedWaterG: 0, lyeWaterG: 0, ambientC: null, flourTotalG: 525, hydration: 0.3,
      restMinMin: 30, restMaxMin: 40, extraWaterG: extra, extraSemolinaG: extra ? 10 : 0, rating, notes: '',
    });
    const a = mk('a', '2026-01-01T10:00:00Z', 0, 2);
    const b = mk('b', '2026-01-02T10:00:00Z', 8, 4);
    for (const l of LOCALES) {
      setLocale(l.id);
      for (const prev of [a, { ...a, rating: null }]) {
        const text = describeDelta(deltaVsPrevious(b, [prev, b])!, 'g');
        expect(text, l.id).not.toMatch(/[{}]|undefined|NaN/);
      }
    }
  });
});

const noop = () => {};
const html = (node: ReactElement) => renderToString(node).replace(/<!-- -->/g, '');
const calc = (form = DEFAULT_FORM, unit: 'g' | 'oz' = 'g') =>
  html(<Calculator form={form} setForm={noop} unit={unit} batches={[]} activeBatch={undefined} onStart={noop} onLogAdjust={noop} onOpenLog={noop} />);

const FORMS = [
  DEFAULT_FORM,
  { ...DEFAULT_FORM, mode: 'alkaline' as const, lyeWaterG: 3, yolkG: 15, eggKind: 'count' as const, eggValue: 3, ambientC: 30 },
  { ...DEFAULT_FORM, mode: 'rolled' as const, machine: 'pin' as const, rollShape: 'ravioli' as const },
  { ...DEFAULT_FORM, machine: 'electric' as const, dieId: '47', die: 'x', eggKind: 'inShell' as const, eggValue: 230 },
];

describe('rendered screens in every language', () => {
  it('show translated headings and never leak placeholders', () => {
    for (const l of LOCALES) {
      setLocale(l.id);
      for (const form of FORMS) {
        const out = calc(form);
        expect(out, `${l.id} ${form.mode}`).not.toMatch(/\{\w+\}|undefined|NaN|\[object/);
        expect(out).toContain(`<h2>${t('res.title')}</h2>`);
        expect(out).toContain(`<legend>${t('mode.legend')}</legend>`);
      }
    }
  });

  it('renders the batch log and its editor text in every language', () => {
    const b: Batch = {
      id: 'x', createdAt: '2026-03-04T10:00:00Z', mode: 'rolled', machine: 'pin', die: 'Ribbons 1 mm', blend: DEFAULT_FORM.blend,
      eggShelledG: 210, yolkG: 20, addedWaterG: 5, lyeWaterG: 0, ambientC: 21.5, flourTotalG: 525, hydration: 0.3,
      restMinMin: 30, restMaxMin: 40, extraWaterG: 8, extraSemolinaG: 0, rating: 4, notes: '',
    };
    for (const l of LOCALES) {
      setLocale(l.id);
      const out = html(<BatchLog batches={[b]} unit="g" activeBatchId="x" onChange={noop} />);
      expect(out, l.id).not.toMatch(/\{\w+\}|undefined|NaN/);
      expect(out).toContain(t('log.title'));
    }
  });

  it('uses the decimal comma in German amounts and the Turkish percent form', () => {
    setLocale('de');
    expect(calc({ ...DEFAULT_FORM, mode: 'rolled', machine: 'pin' })).toContain('37,5');
    setLocale('tr');
    expect(calc({ ...DEFAULT_FORM, mode: 'rolled', machine: 'pin' })).toContain('%37,5');
  });
});
