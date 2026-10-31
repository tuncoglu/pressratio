import { en } from './en';
import { tr } from './tr';
import { de } from './de';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';

export type MsgKey = keyof typeof en;
export type Locale = 'en' | 'tr' | 'de' | 'es' | 'fr' | 'it';

export const LOCALES: { id: Locale; label: string; tag: string }[] = [
  { id: 'en', label: 'English', tag: 'en-GB' },
  { id: 'tr', label: 'Türkçe', tag: 'tr-TR' },
  { id: 'de', label: 'Deutsch', tag: 'de-DE' },
  { id: 'es', label: 'Español', tag: 'es-ES' },
  { id: 'fr', label: 'Français', tag: 'fr-FR' },
  { id: 'it', label: 'Italiano', tag: 'it-IT' },
];

const DICTS: Record<Locale, Record<MsgKey, string>> = { en, tr, de, es, fr, it };

let current: Locale = 'en';

export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.id === v);
export const getLocale = (): Locale => current;
/** BCP 47 tag of the current language, for dates and numbers. */
export const localeTag = (): string => LOCALES.find((l) => l.id === current)!.tag;
export function setLocale(l: Locale): void {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

/** The best supported language from the browser's preference list, else English. */
export function detectLocale(langs: readonly string[] | undefined = typeof navigator !== 'undefined' ? navigator.languages : undefined): Locale {
  for (const raw of langs ?? []) {
    const base = raw.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

export type Params = Record<string, string | number>;

/** A message that is translated when it is shown, so results stay valid across language changes. */
export interface Msg {
  k: MsgKey;
  p?: Params;
}
export type Text = string | Msg;

export const m = (k: MsgKey, p?: Params): Msg => ({ k, p });

const numFormats = new Map<Locale, Intl.NumberFormat>();
/** A number as the current language writes it: decimal comma where that is the custom, never grouped. */
export function n(x: number): string {
  let f = numFormats.get(current);
  if (!f) {
    f = new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 10, useGrouping: false });
    numFormats.set(current, f);
  }
  return f.format(x);
}

function fill(template: string, p?: Params): string {
  if (!p) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = p[name];
    if (v === undefined) return whole;
    return typeof v === 'number' ? n(v) : v;
  });
}

export function t(k: MsgKey, p?: Params): string {
  return fill(DICTS[current][k] ?? en[k], p);
}

/** Translate a message or pass a plain string through. */
export function tx(x: Text): string {
  return typeof x === 'string' ? x : t(x.k, x.p);
}

type PluralBase = MsgKey extends infer K ? (K extends `${infer B}_one` ? B : never) : never;

/** Pick `<base>_one` or `<base>_other` for a count, in the current language's rules. */
export function tp(base: PluralBase, count: number, p?: Params): string {
  const form = new Intl.PluralRules(localeTag()).select(count);
  const key = (form === 'one' ? `${base}_one` : `${base}_other`) as MsgKey;
  return t(key, { count, ...p });
}

/** "37.5 %" in English, "%37,5" in Turkish, and so on. */
export const pct = (v: number): string => t('fmt.pct', { v });
