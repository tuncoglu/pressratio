// All numeric model constants live here.
//
// Three groups:
//   1. Values given by the project brief.
//   2. Values derived from published data or arithmetic (source in the comment).
//   3. Values marked `PLACEHOLDER — needs user calibration`. These are
//      surfaced in the UI with an "uncalibrated" badge (see PLACEHOLDERS below).
//
// All hydration figures are on an "as-is" basis: water you add (including egg
// water) divided by flour as weighed. Flour's own moisture (~10–15 %) is not
// counted, so the squeeze test stays the final authority.

// ---- Given by the brief ------------------------------------------------

/** Whole egg is ~75 % water (USDA FoodData Central 171287: ~76 g / 100 g). */
export const EGG_WATER_FRACTION = 0.75;

/** Shelled weight = in-shell weight x 0.90 (shell is ~9–12 % and shrinks with egg size). */
export const IN_SHELL_YIELD = 0.9;

/** Extruded semolina + egg: water as a fraction of total flour weight. */
export const EXTRUDED_HYDRATION = { target: 0.3, min: 0.286, max: 0.315 } as const;

/** Asian alkaline noodle reference recipe, as baker's fractions of flour weight. */
export const ALKALINE = {
  sodaFraction: 0.015, // baked baking soda (sodium carbonate); kansui products quote 1.0–1.5 %
  saltFraction: 0.007,
  eggFraction: 0.35,
  addedWaterMin: 0.1, // start at the low end
  addedWaterMax: 0.17,
} as const;

export const DEFAULT_AMBIENT_C = 20;
export const COLD_BELOW_C = 18;
export const WARM_ABOVE_C = 26;

/** Rest minutes: 100 % coarse semolina -> coarseBaseMin, 0 % -> otherBaseMin. */
export const REST = {
  coarseBaseMin: 30,
  otherBaseMin: 20,
  coldExtraMin: 10,
  warmLessMin: 5,
  spanMin: 10,
  roundToMin: 5,
} as const;

export const POWDERY_RETEST_REST_MIN = [5, 10] as const;

// ---- Derived -----------------------------------------------------------

/** Egg yolk is ~52 % water (USDA FoodData Central 172184). */
export const YOLK_WATER_FRACTION = 0.52;

/**
 * Shelled grams per egg by size class. US Large: 24 oz/dozen minimum
 * (56.7 g in shell). EU classes (Reg. 589/2008): M 53–63 g, L 63–73 g,
 * XL >= 73 g in shell; class midpoint (XL: 75 g) x IN_SHELL_YIELD.
 */
export const EGG_SIZES = {
  usLarge: { label: 'US large', shelledG: 50 },
  euM: { label: 'EU M (53–63 g)', shelledG: 52 },
  euL: { label: 'EU L (63–73 g)', shelledG: 61 },
  euXL: { label: 'EU XL (73 g+)', shelledG: 67 },
} as const;
export type EggSize = keyof typeof EGG_SIZES;
/** The brief's "large egg" assumption. */
export const DEFAULT_EGG_SIZE: EggSize = 'usLarge';

/**
 * Squeeze-test corrective steps scale with batch size. The brief's 1 tsp water
 * (~5 g) and 10 g semolina were stated for its ~500 g reference batch, i.e.
 * ~1 % and ~2 % of flour. One water step moves hydration ~1 point, about a
 * third of the 2.9-point extruded band, so fixed gram steps over-correct small batches.
 */
export const WATER_STEP_FRACTION = 0.01;
export const SEMOLINA_STEP_FRACTION = 0.02;
export const MIN_WATER_STEP_G = 1;
export const MIN_SEMOLINA_STEP_G = 2;

/**
 * How far the egg weight can be off, by how it was entered (fraction, +/-).
 * count: an EU size class spans +/-5 g around a 58–68 g midpoint (~7–9 %);
 *        picking the wrong class is worse and isn't included.
 * inShell: shell is ~9–12 % of the egg, so the 0.90 yield is good to ~2 %.
 * Weighed shelled eggs: only kitchen-scale resolution, so that error is
 * SCALE_RESOLUTION_G divided by the egg weight rather than a fixed fraction.
 */
export const EGG_INPUT_UNCERTAINTY = { count: 0.08, inShell: 0.02 } as const;
export const SCALE_RESOLUTION_G = 1;

/** Physical conversion: 1 tsp of water ~ 5 g. */
export const TSP_WATER_G = 5;

/** 2 NaHCO3 -> Na2CO3 + H2O + CO2: 106 / (2 x 84) = 0.631 g carbonate per g baking soda. */
export const BAKING_SODA_TO_CARBONATE = 106 / 168;

/**
 * USDA FSIS: perishables no more than 2 h in the 4–60 °C danger zone, 1 h when
 * it is above 90 °F (32 °C). Time is cumulative from cracking the eggs.
 */
export const HOLD_LIMIT = { normalH: 2, hotH: 1, hotAboveC: 32 } as const;

export const GRAMS_PER_OUNCE = 28.349523125;

/**
 * Calibration policy (not a physical constant): which logged batches count
 * as "good", how many are needed before suggesting a personal target, and how
 * different a batch's flour blend may be (percentage points moved between
 * flours) and still count. Flours absorb different amounts of water, so a
 * target learned on one blend shouldn't silently apply to a very different one.
 */
export const CALIBRATION = { minRating: 4, minBatches: 2, maxBlendDistance: 20 } as const;

/**
 * Display threshold (not a model input): blends at or above this weighted
 * protein get a "strong flour" note. Stronger flours absorb more water
 * (Sirman pasta manual) and gluten tenacity raises the force needed to extrude
 * (Bresciani, Pagani & Marti 2022, Foods 11:256, Table 1).
 */
export const STRONG_BLEND_PROTEIN = 13.5;

// ---- PLACEHOLDERS — need user calibration ------------------------------

// PLACEHOLDER — needs user calibration
/** Water-only (no egg) extrusion hydration, as a fraction of flour weight. */
export const WATER_ONLY_HYDRATION = { target: 0.3, min: 0.286, max: 0.315 } as const;

// PLACEHOLDER — needs user calibration
/**
 * Alkali (as carbonate) per gram of bottled lye water. Brand-dependent and
 * unpublished. 0.25 mirrors the common homemade substitute of 1/4 tsp
 * baked soda in 1 tsp water (~1.3 g in ~6 g).
 */
export const LYE_WATER_CARBONATE_FRACTION = 0.25;

export type PlaceholderId = 'WATER_ONLY_HYDRATION' | 'LYE_WATER_CARBONATE_FRACTION';

/** Human-readable list, shown in the UI and mirrored in the README. */
export const PLACEHOLDERS: Record<PlaceholderId, { label: string; value: string }> = {
  WATER_ONLY_HYDRATION: {
    label: 'Water-only (no egg) extrusion hydration',
    value: '30 % of flour weight (same as egg dough until you calibrate it)',
  },
  LYE_WATER_CARBONATE_FRACTION: {
    label: 'Alkali content of bottled lye water',
    value: '~25 % by weight (brands vary and rarely publish it)',
  },
};
