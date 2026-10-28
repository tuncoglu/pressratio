import { DEFAULT_EGG_SIZE, EGG_SIZES, RAVIOLI_PORTION_G, type EggSize, type RavioliPortion } from './calc/constants';
import { BIGOLARO_MODELS, ELECTRIC_MODELS, type BigolaroModel, type ElectricModel } from './data/bottene';
import { DEFAULT_FLOUR_CHOICE, flourById, type FlourChoice } from './data/flours';
import { ROLL_SHAPES, type RollShape } from './data/rolled';
import type { Batch, Blend, EggKind, FlourKey, Machine, Mode, Unit } from './calc/types';
import { FLOUR_KEYS, blendSum } from './calc/calc';

const KEY = 'pressratio.v1';

export interface FormState {
  mode: Mode;
  eggKind: EggKind;
  eggValue: number;
  eggSize: EggSize;
  yolkG: number;
  addedWaterG: number;
  lyeWaterG: number;
  blend: Blend;
  machine: Machine;
  pressModel: BigolaroModel | null;
  electricModel: ElectricModel | null;
  /** Selected die from the machine's list ('' when custom or none). */
  dieId: string;
  /** Display name of the die, stored on batches. */
  die: string;
  dieCustom: boolean;
  flours: FlourChoice;
  ambientC: number | null;
  /** Use the personal target from the batch log when one exists. */
  useCalibration: boolean;
  /** Shape being rolled (rolled mode). */
  rollShape: RollShape;
  /** Ravioli side length, cm. */
  ravioliCm: number;
  /** Your own filling per ravioli (g); null = estimate from size. */
  fillingG: number | null;
  ravioliPortion: RavioliPortion;
}

export interface AppState {
  unit: Unit;
  form: FormState;
  batches: Batch[];
  activeBatchId: string | null;
}

export const DEFAULT_FORM: FormState = {
  mode: 'extruded',
  eggKind: 'shelled',
  eggValue: 210,
  eggSize: DEFAULT_EGG_SIZE,
  yolkG: 0,
  addedWaterG: 0,
  lyeWaterG: 0,
  blend: { type00: 0, fineSemolina: 0, coarseSemolina: 100, breadFlour: 0 },
  machine: 'manual',
  // The owner's press: Bottene Bigolaro mod. B (480 g per load, 8/B die family).
  pressModel: 'B',
  electricModel: null,
  dieId: '10',
  die: 'N°10 Bigoli Ø3.0 mm',
  dieCustom: false,
  flours: DEFAULT_FLOUR_CHOICE,
  ambientC: null,
  useCalibration: true,
  rollShape: 'ribbons',
  ravioliCm: 5,
  fillingG: null,
  ravioliPortion: 'main',
};

export const DEFAULT_STATE: AppState = {
  unit: 'g',
  form: DEFAULT_FORM,
  batches: [],
  activeBatchId: null,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const p = JSON.parse(raw);
    return {
      unit: p.unit === 'oz' ? 'oz' : 'g',
      form: sanitizeForm(p.form),
      batches: Array.isArray(p.batches) ? p.batches.map(sanitizeBatch).filter(isBatch) : [],
      activeBatchId: typeof p.activeBatchId === 'string' ? p.activeBatchId : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked (private mode): the app keeps working in memory.
  }
}

// ---- Export / import ---------------------------------------------------

export const EXPORT_APP = 'pressratio';
export const EXPORT_VERSION = 1;

export function exportJson(state: Pick<AppState, 'unit' | 'batches'>): string {
  return JSON.stringify(
    {
      app: EXPORT_APP,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      unit: state.unit,
      batches: state.batches,
    },
    null,
    2,
  );
}

const MODES: Mode[] = ['extruded', 'alkaline', 'rolled'];
const MACHINES: Machine[] = ['manual', 'electric', 'roller', 'pin'];

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** Coerce an unknown object into a Batch, or return null if it is unusable. */
export function sanitizeBatch(v: unknown): Batch | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.createdAt !== 'string' || Number.isNaN(Date.parse(o.createdAt))) return null;
  if (!MODES.includes(o.mode as Mode)) return null;
  const b = (o.blend ?? {}) as Record<string, unknown>;
  const blend = {} as Blend;
  for (const k of FLOUR_KEYS) blend[k] = Math.max(0, num(b[k]));
  if (blendSum(blend) !== 100) return null;
  const rating = o.rating == null ? null : Math.min(5, Math.max(1, Math.round(num(o.rating, 1))));
  return {
    id: o.id,
    createdAt: o.createdAt,
    mode: o.mode as Mode,
    machine: MACHINES.includes(o.machine as Machine) ? (o.machine as Machine) : 'manual',
    die: typeof o.die === 'string' ? o.die : '',
    blend,
    eggShelledG: Math.max(0, num(o.eggShelledG)),
    yolkG: Math.max(0, num(o.yolkG)),
    addedWaterG: Math.max(0, num(o.addedWaterG)),
    lyeWaterG: Math.max(0, num(o.lyeWaterG)),
    ambientC: o.ambientC == null ? null : num(o.ambientC, 20),
    flourTotalG: Math.max(0, num(o.flourTotalG)),
    hydration: Math.max(0, num(o.hydration)),
    restMinMin: Math.max(0, num(o.restMinMin)),
    restMaxMin: Math.max(0, num(o.restMaxMin)),
    extraWaterG: Math.max(0, num(o.extraWaterG)),
    extraSemolinaG: Math.max(0, num(o.extraSemolinaG)),
    rating,
    notes: typeof o.notes === 'string' ? o.notes : '',
    flours: sanitizeFlours(o.flours),
    pressModel: typeof o.pressModel === 'string' && o.pressModel in BIGOLARO_MODELS ? o.pressModel : undefined,
  };
}

function sanitizeFlours(v: unknown): Partial<Record<FlourKey, string>> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Partial<Record<FlourKey, string>> = {};
  for (const k of FLOUR_KEYS) {
    const id = (v as Record<string, unknown>)[k];
    if (typeof id === 'string' && flourById(id)?.role === k) out[k] = id;
  }
  return out;
}

function sanitizeForm(v: unknown): FormState {
  const f = { ...DEFAULT_FORM, ...(v && typeof v === 'object' ? v : {}) } as FormState;
  if (!(f.eggSize in EGG_SIZES)) f.eggSize = DEFAULT_EGG_SIZE;
  if (blendSum(f.blend ?? ({} as Blend)) !== 100) f.blend = DEFAULT_FORM.blend;
  if (!(f.rollShape in ROLL_SHAPES)) f.rollShape = 'ribbons';
  if (!(typeof f.ravioliCm === 'number' && f.ravioliCm > 0 && f.ravioliCm < 30)) f.ravioliCm = DEFAULT_FORM.ravioliCm;
  if (typeof f.fillingG !== 'number' || !(f.fillingG > 0)) f.fillingG = null;
  if (!(f.ravioliPortion in RAVIOLI_PORTION_G)) f.ravioliPortion = 'main';
  if (!['manual', 'electric', 'roller', 'pin'].includes(f.machine)) f.machine = 'manual';
  if (f.pressModel != null && !(f.pressModel in BIGOLARO_MODELS)) f.pressModel = null;
  if (f.electricModel != null && !(f.electricModel in ELECTRIC_MODELS)) f.electricModel = null;
  if (typeof f.dieId !== 'string') f.dieId = '';
  const flours = { ...DEFAULT_FLOUR_CHOICE, ...(f.flours ?? {}) };
  for (const k of FLOUR_KEYS) if (flourById(flours[k])?.role !== k) flours[k] = DEFAULT_FLOUR_CHOICE[k];
  f.flours = flours;
  return f;
}

function isBatch(b: Batch | null): b is Batch {
  return b !== null;
}

export type ImportResult =
  | { ok: true; batches: Batch[]; skipped: number }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  const o = data as { app?: unknown; batches?: unknown } | null;
  if (!o || o.app !== EXPORT_APP || !Array.isArray(o.batches)) {
    return { ok: false, error: 'That file is not a PressRatio export.' };
  }
  const batches = o.batches.map(sanitizeBatch).filter(isBatch);
  return { ok: true, batches, skipped: o.batches.length - batches.length };
}

/** Merge imported batches into existing ones by id; the imported copy wins. */
export function mergeBatches(existing: Batch[], incoming: Batch[]): Batch[] {
  const byId = new Map(existing.map((b) => [b.id, b]));
  for (const b of incoming) byId.set(b.id, b);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
