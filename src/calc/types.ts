export type Mode = 'extruded' | 'alkaline' | 'rolled';
export type Machine = 'manual' | 'electric' | 'roller' | 'pin';
export type FlourKey = 'type00' | 'fineSemolina' | 'coarseSemolina' | 'breadFlour';
/** Whole-number percentages that sum to 100. */
export type Blend = Record<FlourKey, number>;
export type Unit = 'g' | 'oz';

import type { EggSize } from './constants';

export type EggKind = 'shelled' | 'count' | 'inShell';
export interface EggInput {
  kind: EggKind;
  value: number;
  /** Size class used when kind is 'count'. */
  size?: EggSize;
}

/** A personal hydration target derived from the batch log. */
export interface Calibration {
  target: number;
  /** Number of logged batches it is based on. */
  n: number;
}

export interface CalcInput {
  mode: Mode;
  egg: EggInput;
  /** Extra yolks on top of whole eggs, shelled grams. */
  yolkG: number;
  addedWaterG: number;
  /** Food-grade lye water (kansui), alkaline mode only. */
  lyeWaterG: number;
  blend: Blend;
  machine: Machine;
  /** null = not entered, defaults to 20 C. */
  ambientC: number | null;
  /** Use this personal target instead of the default. In alkaline mode it sets the added water. */
  calibration?: Calibration | null;
}

export interface Warning {
  id: string;
  level: 'warn' | 'info';
  text: string;
}

export interface RestPlan {
  minMin: number;
  maxMin: number;
  /** Coarse semolina share of the blend, 0–1. */
  coarseShare: number;
  /** Max total hours raw-egg dough should sit unrefrigerated. */
  holdLimitH: number;
  notes: string[];
}

export interface IngredientRow {
  label: string;
  grams: number;
  /** Baker's percentage (of total flour weight). */
  pct: number;
  note?: string;
}

export type CalcStatus = 'ok' | 'empty' | 'invalid-blend' | 'unsupported';

export interface CalcResult {
  status: CalcStatus;
  /** Why there are no numbers, when status is not 'ok'. */
  message?: string;
  eggShelledG: number;
  yolkG: number;
  eggWaterG: number;
  addedWaterG: number;
  lyeWaterG: number;
  totalWaterG: number;
  totalLiquidG: number;
  /** Salt and alkali (alkaline mode), grams. */
  additivesG: number;
  flourTotalG: number;
  /** [min, max]; equal in alkaline mode. */
  flourRangeG: [number, number];
  flourBreakdownG: Record<FlourKey, number>;
  /** Water as a fraction of flour weight. */
  hydration: number;
  hydrationRange: [number, number];
  textureTarget: string;
  rest: RestPlan;
  ingredients: IngredientRow[];
  /** Suggested added-water range in grams (alkaline mode). */
  suggestedAddedWaterG: [number, number] | null;
  warnings: Warning[];
  /** Placeholder constants this result relied on. */
  uncalibrated: string[];
  /** True when lye-water conversion is in play (unvalidated). */
  lyeUnvalidated: boolean;
  /** Estimated alkali from lye water as % of flour (placeholder-based), when lye is used. */
  lyeAlkaliPct: number | null;
  /** The personal target in use, if any. */
  calibration: Calibration | null;
  /** How much the flour figure could be off because of how the egg was entered. */
  eggError: EggError | null;
}

export interface EggError {
  kind: EggKind;
  /** Relative error of the egg weight, +/-. */
  fraction: number;
  /** Resulting flour error in grams, +/-. */
  flourG: number;
  /** Flour error if the same eggs were weighed shelled instead. */
  weighedFlourG: number;
}

export type SqueezeState = 'crumbly' | 'powdery' | 'sticky';

export interface SqueezeAdvice {
  state: SqueezeState;
  verdict: 'ready' | 'add-water' | 'add-semolina';
  title: string;
  action: string;
  /** Grams of water to add per step (add-water only). */
  waterStepG?: number;
  /** Grams of semolina to add per step (add-semolina only). */
  semolinaStepG?: number;
}

export interface Batch {
  id: string;
  /** ISO timestamp. */
  createdAt: string;
  mode: Mode;
  machine: Machine;
  die: string;
  blend: Blend;
  eggShelledG: number;
  yolkG: number;
  addedWaterG: number;
  lyeWaterG: number;
  ambientC: number | null;
  flourTotalG: number;
  hydration: number;
  restMinMin: number;
  restMaxMin: number;
  /** Extra water added during squeeze-test adjustment. */
  extraWaterG: number;
  /** Extra semolina added during squeeze-test adjustment. */
  extraSemolinaG: number;
  /** 1-5, null = not rated. */
  rating: number | null;
  notes: string;
  /** Flour product chosen for each blend slot in use. */
  flours?: Partial<Record<FlourKey, string>>;
  /** Bigolaro model, if set. */
  pressModel?: string | null;
}

export interface BatchDelta {
  prevId: string;
  extraWaterG: number;
  prevExtraWaterG: number;
  extraSemolinaG: number;
  prevExtraSemolinaG: number;
  /** Hydration actually reached, including adjustments. */
  achievedHydration: number;
  prevAchievedHydration: number;
  rating: number | null;
  prevRating: number | null;
}
