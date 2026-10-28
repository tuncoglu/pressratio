import {
  ALKALINE,
  ALKALINE_PUBLISHED_HYDRATION,
  BAKING_SODA_TO_CARBONATE,
  CALIBRATION,
  COLD_BELOW_C,
  DEFAULT_AMBIENT_C,
  DEFAULT_EGG_SIZE,
  EGG_INPUT_UNCERTAINTY,
  EGG_SIZES,
  EGG_WATER_FRACTION,
  EXTRUDED_HYDRATION,
  GRAMS_PER_OUNCE,
  HOLD_LIMIT,
  IN_SHELL_YIELD,
  LYE_WATER_CARBONATE_FRACTION,
  MIN_SEMOLINA_STEP_G,
  MIN_WATER_STEP_G,
  POWDERY_RETEST_REST_MIN,
  REST,
  ROLLED_HYDRATION,
  ROLLED_REST,
  SCALE_RESOLUTION_G,
  SHEET_REF_CM,
  DOUGH_DENSITY,
  STRONG_BLEND_PROTEIN,
  SEMOLINA_STEP_FRACTION,
  TSP_WATER_G,
  WARM_ABOVE_C,
  WATER_ONLY_HYDRATION,
  WATER_STEP_FRACTION,
  YOLK_WATER_FRACTION,
  type EggSize,
} from './constants';
import type {
  Batch,
  BatchDelta,
  Blend,
  CalcInput,
  CalcResult,
  Calibration,
  EggError,
  EggInput,
  FlourKey,
  IngredientRow,
  Machine,
  Mode,
  RestPlan,
  SqueezeAdvice,
  SqueezeState,
  Unit,
  Warning,
} from './types';

export const FLOUR_KEYS: FlourKey[] = ['type00', 'fineSemolina', 'coarseSemolina', 'breadFlour'];

export const FLOUR_LABELS: Record<FlourKey, string> = {
  type00: 'Type 00',
  fineSemolina: 'Fine semolina',
  coarseSemolina: 'Coarse semolina',
  breadFlour: 'Bread flour',
};

// ---- Units -------------------------------------------------------------

export function gToUnit(g: number, unit: Unit): number {
  return unit === 'oz' ? g / GRAMS_PER_OUNCE : g;
}

export function unitToG(value: number, unit: Unit): number {
  return unit === 'oz' ? value * GRAMS_PER_OUNCE : value;
}

/** "525 g" or "18.5 oz". */
export function formatAmount(g: number, unit: Unit): string {
  if (unit === 'oz') return `${round(g / GRAMS_PER_OUNCE, 2)} oz`;
  return `${round(g, g < 20 ? 1 : 0)} g`;
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  // The nudge keeps 36.249999999999996 (float noise for 36.25) rounding the same way as 36.25.
  return Math.round(n * f + Math.sign(n) * 1e-9) / f;
}

/** Water grams as kitchen teaspoons, to the nearest quarter: "½ tsp", "1¼ tsp". */
export function formatTsp(waterG: number): string {
  const quarters = Math.max(1, Math.round((waterG / TSP_WATER_G) * 4));
  const whole = Math.floor(quarters / 4);
  const frac = ['', '¼', '½', '¾'][quarters % 4];
  return `${whole > 0 ? whole : ''}${frac} tsp`;
}

// ---- Flour blend -------------------------------------------------------

/** Percentage points that would have to move to turn one blend into the other (0–100). */
export function blendDistance(a: Blend, b: Blend): number {
  return FLOUR_KEYS.reduce((s, k) => s + Math.abs(a[k] - b[k]), 0) / 2;
}

export function blendSum(blend: Blend): number {
  return FLOUR_KEYS.reduce((s, k) => s + blend[k], 0);
}

export function isValidBlend(blend: Blend): boolean {
  return FLOUR_KEYS.every((k) => blend[k] >= 0) && Math.abs(blendSum(blend) - 100) < 1e-9;
}

export const BLEND_PRESETS: { id: string; label: string; blend: Blend }[] = [
  {
    id: 'coarse100',
    label: '100 % coarse semolina',
    blend: { type00: 0, fineSemolina: 0, coarseSemolina: 100, breadFlour: 0 },
  },
  {
    id: '70-30',
    label: '70 % 00 / 30 % coarse',
    blend: { type00: 70, fineSemolina: 0, coarseSemolina: 30, breadFlour: 0 },
  },
  {
    id: '50-50',
    label: '50 / 50 (00 + coarse)',
    blend: { type00: 50, fineSemolina: 0, coarseSemolina: 50, breadFlour: 0 },
  },
];

/**
 * Set one flour's share to `pct` (whole percent) and rescale the others
 * proportionally so the blend still sums to exactly 100.
 */
export function setShare(blend: Blend, key: FlourKey, pct: number): Blend {
  const v = Math.min(100, Math.max(0, Math.round(Number.isFinite(pct) ? pct : 0)));
  const others = FLOUR_KEYS.filter((k) => k !== key);
  const remaining = 100 - v;
  const otherSum = others.reduce((s, k) => s + blend[k], 0);
  const next: Blend = { ...blend, [key]: v };

  if (otherSum === 0) {
    // Nothing to scale: park the remainder somewhere sensible.
    for (const k of others) next[k] = 0;
    if (remaining > 0) next[key === 'type00' ? 'coarseSemolina' : 'type00'] = remaining;
    return next;
  }

  // Proportional split, largest-remainder rounding so the total is exact.
  const raw = others.map((k) => (blend[k] * remaining) / otherSum);
  const floors = raw.map(Math.floor);
  let leftover = remaining - floors.reduce((s, n) => s + n, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (leftover <= 0) break;
    floors[i] += 1;
    leftover -= 1;
  }
  others.forEach((k, i) => (next[k] = floors[i]));
  return next;
}

// ---- Eggs --------------------------------------------------------------

/** Shelled egg weight in grams for whichever way the user entered it. */
export function eggToShelledG(egg: EggInput): number {
  const v = Number.isFinite(egg.value) ? Math.max(0, egg.value) : 0;
  switch (egg.kind) {
    case 'shelled':
      return v;
    case 'count':
      return v * EGG_SIZES[egg.size ?? DEFAULT_EGG_SIZE].shelledG;
    case 'inShell':
      return v * IN_SHELL_YIELD;
  }
}

/** Re-express a shelled weight in another entry style (for switching input kinds). */
export function eggFromShelledG(shelledG: number, kind: EggInput['kind'], size: EggSize = DEFAULT_EGG_SIZE): EggInput {
  switch (kind) {
    case 'shelled':
      return { kind, value: round(shelledG, 1) };
    case 'count':
      return { kind, size, value: round(shelledG / EGG_SIZES[size].shelledG, 1) };
    case 'inShell':
      return { kind, value: round(shelledG / IN_SHELL_YIELD, 1) };
  }
}

/** Relative error of a whole-egg weight, depending on how it was entered. */
export function eggInputUncertainty(kind: EggInput['kind'], shelledG: number): number {
  if (kind === 'count') return EGG_INPUT_UNCERTAINTY.count;
  if (kind === 'inShell') return EGG_INPUT_UNCERTAINTY.inShell;
  return shelledG > 0 ? SCALE_RESOLUTION_G / shelledG : 0;
}

/**
 * Flour error caused by the egg input. `flourPerEggG` is how many grams of
 * flour each gram of whole egg drives (it depends on the mode).
 */
function eggError(egg: EggInput, shelledG: number, flourPerEggG: number): EggError | null {
  if (shelledG <= 0) return null;
  const fraction = eggInputUncertainty(egg.kind, shelledG);
  return {
    kind: egg.kind,
    fraction,
    flourG: shelledG * fraction * flourPerEggG,
    weighedFlourG: shelledG * eggInputUncertainty('shelled', shelledG) * flourPerEggG,
  };
}

/** Water contributed by whole egg plus extra yolks. */
export function eggWaterG(wholeEggG: number, yolkG: number): number {
  return wholeEggG * EGG_WATER_FRACTION + yolkG * YOLK_WATER_FRACTION;
}

// ---- Rest time ---------------------------------------------------------

export function holdLimitH(ambientC: number | null): number {
  return (ambientC ?? DEFAULT_AMBIENT_C) > HOLD_LIMIT.hotAboveC ? HOLD_LIMIT.hotH : HOLD_LIMIT.normalH;
}

/**
 * Water diffuses into semolina particles more slowly the larger they are, so
 * rest scales continuously with the coarse share instead of jumping at a
 * threshold. The endpoints match the brief: 100 % coarse = 30, 0 % = 20.
 */
export function restPlan(blend: Blend, ambientC: number | null, mode: Mode = 'extruded'): RestPlan {
  const t = ambientC ?? DEFAULT_AMBIENT_C;
  const coarseShare = Math.min(1, Math.max(0, blend.coarseSemolina / 100));
  const rolled = mode === 'rolled';
  let base = rolled
    ? ROLLED_REST.baseMin + ROLLED_REST.coarseExtraMin * coarseShare
    : REST.otherBaseMin + (REST.coarseBaseMin - REST.otherBaseMin) * coarseShare;
  base = Math.round(base / REST.roundToMin) * REST.roundToMin;
  if (t < COLD_BELOW_C) base += REST.coldExtraMin;
  if (t > WARM_ABOVE_C) base -= REST.warmLessMin;
  const hold = holdLimitH(ambientC);
  const holdNote =
    hold === HOLD_LIMIT.hotH
      ? `It is above ${HOLD_LIMIT.hotAboveC} °C: raw-egg dough should spend no more than ${hold} hour unrefrigerated in total (USDA). Refrigerate it wrapped if holding longer, then let it come back to room temperature before rolling.`
      : `If you will hold the dough longer than ${hold} hours in total (raw egg, USDA guidance), refrigerate it wrapped, then let it come back to room temperature before rolling.`;
  const notes = rolled
    ? [
        'Knead until smooth (about 8–10 minutes by hand), then wrap tightly and rest at room temperature. Wrapping stops a dry skin forming.',
        'Coarse semolina hydrates slowly and feels dry and gritty at first. Judge the dough after the rest, not before. If it is still shaggy, add water in small steps and knead again.',
        'If the sheet keeps springing back while you roll, the gluten is tight: cover it and rest 5–10 minutes. A longer rest (Sirman: hours, chilled) makes sheets stretchier.',
        holdNote,
      ]
    : [
    'Rest covered, at room temperature. Covering stops the crumbs drying out; chilling would slow the water uptake the rest is for, so never refrigerate a short rest.',
    'Coarse semolina hydrates slowly (bigger particles take longer to wet through). If it is still powdery after the rest, add water in small steps and rest 5–10 min.',
    hold === HOLD_LIMIT.hotH
      ? `It is above ${HOLD_LIMIT.hotAboveC} °C: raw-egg dough should spend no more than ${hold} hour unrefrigerated in total (USDA). Refrigerate covered if holding longer, then temper 20–30 min before pressing.`
      : `If you will hold the mix longer than ${hold} hours in total (raw egg, USDA guidance), refrigerate it covered, then temper 20–30 min before loading the press.`,
    'Never load cold dough into a manual press: cold dough is stiffer and much harder to push through the die.',
  ];
  const span = rolled ? ROLLED_REST.spanMin : REST.spanMin;
  return { minMin: base, maxMin: base + span, coarseShare, holdLimitH: hold, notes };
}

// ---- Main calculation --------------------------------------------------

export const TEXTURE_TARGETS = {
  extruded:
    'Damp sand — should clump when squeezed, not form a smooth ball. Slightly crumbly is fine; powdery is not.',
  alkaline:
    'Stiff, shaggy crumbs that press together into a firm dough. Expect it to look drier than a hand-rolled noodle dough.',
  rolled:
    'A smooth, firm ball that springs back slowly when pressed: slightly tacky but not sticky. Coarse semolina can look rough and feel dry until it has rested.',
} as const;

function emptyResult(input: CalcInput, status: CalcResult['status'], message: string): CalcResult {
  const eggShelledG = eggToShelledG(input.egg);
  return {
    status,
    message,
    eggShelledG,
    yolkG: input.yolkG,
    eggWaterG: eggWaterG(eggShelledG, input.yolkG),
    addedWaterG: input.addedWaterG,
    lyeWaterG: input.lyeWaterG,
    totalWaterG: 0,
    totalLiquidG: 0,
    additivesG: 0,
    flourTotalG: 0,
    flourRangeG: [0, 0],
    flourBreakdownG: { type00: 0, fineSemolina: 0, coarseSemolina: 0, breadFlour: 0 },
    hydration: 0,
    hydrationRange: [0, 0],
    textureTarget: '',
    rest: restPlan(input.blend, input.ambientC, input.mode),
    ingredients: [],
    suggestedAddedWaterG: null,
    warnings: [],
    uncalibrated: [],
    lyeUnvalidated: false,
    lyeAlkaliPct: null,
    calibration: null,
    eggError: null,
  };
}

function breakdown(blend: Blend, flourTotalG: number): Record<FlourKey, number> {
  const out = {} as Record<FlourKey, number>;
  for (const k of FLOUR_KEYS) out[k] = (flourTotalG * blend[k]) / 100;
  return out;
}

function sanitize(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function calculate(raw: CalcInput): CalcResult {
  const input: CalcInput = {
    ...raw,
    yolkG: sanitize(raw.yolkG),
    addedWaterG: sanitize(raw.addedWaterG),
    lyeWaterG: raw.mode === 'alkaline' ? sanitize(raw.lyeWaterG) : 0,
  };

  if (!isValidBlend(input.blend)) {
    return emptyResult(input, 'invalid-blend', 'Flour blend must add up to 100 %.');
  }

  const eggShelledG = eggToShelledG(input.egg);
  const allEggG = eggShelledG + input.yolkG;
  const eggWater = eggWaterG(eggShelledG, input.yolkG);
  const warnings: Warning[] = [];
  const uncalibrated: string[] = [];
  const rolled = input.mode === 'rolled';
  const rest = restPlan(input.blend, input.ambientC, input.mode);

  if (rolled && rest.coarseShare >= 0.9) {
    warnings.push({
      id: 'rolled-all-coarse',
      level: 'info',
      text: 'An all-coarse-semolina dough is slow to hydrate and can roll out gritty and tough with a pin. Expect the long end of the rest, and consider blending in some 00 if sheets tear or spring back (home-cook consensus, not tested here).',
    });
  }

  if (input.yolkG > 0) {
    warnings.push({
      id: 'yolk-fat',
      level: 'info',
      text: 'Only the water in yolks is counted (~52 %). How yolk fat and solids shift the right hydration is uncalibrated: one manufacturer\'s yolk-only extruder recipe (Sirman tajarin) runs at ~35 % water, above this band. Let the squeeze test decide.',
    });
  }

  if (input.mode === 'extruded' || rolled) {
    const totalWaterG = eggWater + input.addedWaterG;
    if (totalWaterG <= 0) {
      return emptyResult(input, 'empty', 'Enter an egg weight or some added water.');
    }
    // Egg dough uses the brief's model; water-only dough uses a placeholder.
    // A personal calibration from the batch log replaces either.
    const base = rolled ? ROLLED_HYDRATION : allEggG > 0 ? EXTRUDED_HYDRATION : WATER_ONLY_HYDRATION;
    const cal = input.calibration ?? null;
    const target = cal ? cal.target : base.target;
    const h = { target, min: target - (base.target - base.min), max: target + (base.max - base.target) };
    if (rolled) {
      uncalibrated.push('ROLLED_REST');
      if (!cal) uncalibrated.push('ROLLED_HYDRATION');
    } else if (allEggG <= 0 && !cal) {
      uncalibrated.push('WATER_ONLY_HYDRATION');
    }

    const flourTotalG = totalWaterG / h.target;
    const flourRangeG: [number, number] = [totalWaterG / h.max, totalWaterG / h.min];

    if (input.machine === 'roller' && !rolled) {
      warnings.push({
        id: 'roller-extruded',
        level: 'warn',
        text: 'A roller is not for extruded dough. This hydration is far too dry to roll — use an extruder, or wait for the softer rolled-pasta mode.',
      });
    }

    return {
      status: 'ok',
      eggShelledG,
      yolkG: input.yolkG,
      eggWaterG: eggWater,
      addedWaterG: input.addedWaterG,
      lyeWaterG: 0,
      totalWaterG,
      totalLiquidG: allEggG + input.addedWaterG,
      additivesG: 0,
      flourTotalG,
      flourRangeG,
      flourBreakdownG: breakdown(input.blend, flourTotalG),
      hydration: totalWaterG / flourTotalG,
      hydrationRange: [h.min, h.max],
      textureTarget: rolled ? TEXTURE_TARGETS.rolled : TEXTURE_TARGETS.extruded,
      rest,
      ingredients: [],
      suggestedAddedWaterG: null,
      warnings,
      uncalibrated,
      lyeUnvalidated: false,
      lyeAlkaliPct: null,
      calibration: cal,
      eggError: eggError(input.egg, eggShelledG, EGG_WATER_FRACTION / h.target),
    };
  }

  // ---- Asian alkaline noodles: reference recipe scaled from the egg ----
  if (allEggG <= 0) {
    return emptyResult(
      input,
      'empty',
      'The alkaline recipe scales from the egg weight. Enter an egg weight or count.',
    );
  }
  const flourTotalG = allEggG / ALKALINE.eggFraction;
  const suggestedAddedWaterG: [number, number] = [
    flourTotalG * ALKALINE.addedWaterMin,
    flourTotalG * ALKALINE.addedWaterMax,
  ];
  // Added water: the user's own figure wins; otherwise the calibrated target
  // from their rated batches; otherwise start at the low end of the range.
  const userWater = input.addedWaterG > 0;
  const cal = !userWater ? (input.calibration ?? null) : null;
  const addedWaterG = userWater
    ? input.addedWaterG
    : cal
      ? Math.max(0, cal.target * flourTotalG - eggWater)
      : suggestedAddedWaterG[0];
  const totalWaterG = eggWater + addedWaterG;
  const lyeUnvalidated = input.lyeWaterG > 0;
  const sodaG = lyeUnvalidated ? 0 : flourTotalG * ALKALINE.sodaFraction;
  const saltG = flourTotalG * ALKALINE.saltFraction;
  const lyeAlkaliPct = lyeUnvalidated
    ? ((input.lyeWaterG * LYE_WATER_CARBONATE_FRACTION) / flourTotalG) * 100
    : null;
  if (lyeUnvalidated) uncalibrated.push('LYE_WATER_CARBONATE_FRACTION');

  const ingredients: IngredientRow[] = [
    { label: 'Flour (total)', grams: flourTotalG, pct: 100 },
    ...FLOUR_KEYS.filter((k) => input.blend[k] > 0).map((k) => ({
      label: `  ${FLOUR_LABELS[k]}`,
      grams: (flourTotalG * input.blend[k]) / 100,
      pct: input.blend[k],
    })),
    { label: 'Egg (shelled)', grams: allEggG, pct: ALKALINE.eggFraction * 100 },
    {
      label: 'Added water',
      grams: addedWaterG,
      pct: (addedWaterG / flourTotalG) * 100,
      note: userWater ? 'your amount' : cal ? 'your calibrated target' : 'start at the low end (10–17 %)',
    },
    { label: 'Salt', grams: saltG, pct: ALKALINE.saltFraction * 100 },
  ];
  if (lyeUnvalidated) {
    ingredients.push({
      label: 'Lye water (kansui)',
      grams: input.lyeWaterG,
      pct: (input.lyeWaterG / flourTotalG) * 100,
      note: `≈ ${round(lyeAlkaliPct!, 2)} % alkali — unvalidated`,
    });
  } else {
    ingredients.push({
      label: 'Baked baking soda (sodium carbonate)',
      grams: sodaG,
      pct: ALKALINE.sodaFraction * 100,
      note: `= ${round(sodaG / BAKING_SODA_TO_CARBONATE, 1)} g baking soda before baking`,
    });
  }

  if (lyeUnvalidated) {
    warnings.push({
      id: 'lye-unvalidated',
      level: 'warn',
      text: `Do not swap lye water and baked soda spoon for spoon in either direction. A common kitchen substitute is 1 tsp lye water ≈ ¼ tsp baked soda dissolved in 1 tsp water, so dry baked soda carries roughly 4× the alkali per spoon. Bottle strength varies by brand. Your ${round(input.lyeWaterG, 1)} g is estimated at ≈ ${round(lyeAlkaliPct!, 2)} % alkali by flour weight (reference recipe: ${ALKALINE.sodaFraction * 100} %). This conversion is unvalidated.`,
    });
  }

  const hydration = totalWaterG / flourTotalG;
  if (input.machine !== 'roller' && !cal && hydration > EXTRUDED_HYDRATION.max) {
    const toExtrudedG = Math.max(0, EXTRUDED_HYDRATION.target * flourTotalG - eggWater);
    const pub = ALKALINE_PUBLISHED_HYDRATION;
    const where = hydration > pub.max ? 'above' : 'inside';
    warnings.push({
      id: 'alkaline-wet-for-press',
      level: 'info',
      text: `Published alkaline-noodle studies run ${round(pub.min * 100)}–${round(pub.max * 100)} % total water (Hatcher 1999; Edwards 1996, rolled noodles), and kansui tends to raise water absorption. This recipe is at ${round(hydration * 100, 1)} %, ${where} that range and above the ${round(EXTRUDED_HYDRATION.min * 100, 1)}–${round(EXTRUDED_HYDRATION.max * 100, 1)} % band used for pressed pasta. Reaching 30 % would mean only ≈ ${round(toExtrudedG)} g added water. What a press needs with alkali is uncalibrated: add the water gradually, let the squeeze test decide, and rate your batches so the app can learn your own target.`,
    });
  }

  return {
    status: 'ok',
    eggShelledG,
    yolkG: input.yolkG,
    eggWaterG: eggWater,
    addedWaterG,
    lyeWaterG: input.lyeWaterG,
    totalWaterG,
    totalLiquidG: allEggG + addedWaterG + input.lyeWaterG,
    additivesG: saltG + sodaG,
    flourTotalG,
    flourRangeG: [flourTotalG, flourTotalG],
    flourBreakdownG: breakdown(input.blend, flourTotalG),
    hydration,
    hydrationRange: [
      (eggWater + suggestedAddedWaterG[0]) / flourTotalG,
      (eggWater + suggestedAddedWaterG[1]) / flourTotalG,
    ],
    textureTarget: TEXTURE_TARGETS.alkaline,
    rest,
    ingredients,
    suggestedAddedWaterG,
    warnings,
    uncalibrated,
    lyeUnvalidated,
    lyeAlkaliPct,
    calibration: cal,
    eggError: eggError(input.egg, eggShelledG, 1 / ALKALINE.eggFraction),
  };
}

// ---- Sheets (rolled dough) ---------------------------------------------

/** Sheet area for a dough weight at a thickness, and how many reference sheets that is. */
export function sheetFor(doughG: number, thicknessMm: number): { areaCm2: number; sheets: number; sideCm: number } {
  if (doughG <= 0 || thicknessMm <= 0) return { areaCm2: 0, sheets: 0, sideCm: 0 };
  const areaCm2 = doughG / (DOUGH_DENSITY * (thicknessMm / 10));
  return { areaCm2, sheets: areaCm2 / SHEET_REF_CM ** 2, sideCm: Math.sqrt(areaCm2) };
}

// ---- Dough, press loads, flours ----------------------------------------

/** Everything that goes into the press, grams. */
export function doughMassG(r: CalcResult): number {
  return r.status === 'ok' ? r.flourTotalG + r.totalLiquidG + r.additivesG : 0;
}

/** How many loads of a press cylinder this dough fills. */
export function pressLoads(doughG: number, capacityG: number): { loads: number; fullLoads: number } {
  if (doughG <= 0 || capacityG <= 0) return { loads: 0, fullLoads: 0 };
  const loads = doughG / capacityG;
  return { loads, fullLoads: Math.ceil(loads - 1e-9) };
}

/** Factor to scale every input by so the dough fills exactly `n` loads. */
export function scaleForLoads(doughG: number, capacityG: number, n: number): number {
  return doughG > 0 ? (n * capacityG) / doughG : 0;
}

/**
 * Share-weighted protein and W of a blend, over the flours whose figures are
 * known. `coverage` is the share of the blend those figures cover (0–1).
 */
export function blendStats(
  blend: Blend,
  specs: Partial<Record<FlourKey, { protein?: number; w?: number }>>,
): { protein: number | null; proteinCoverage: number; w: number | null; wCoverage: number } {
  let p = 0, pShare = 0, w = 0, wShare = 0;
  for (const k of FLOUR_KEYS) {
    const share = blend[k] / 100;
    const s = specs[k];
    if (share <= 0 || !s) continue;
    if (s.protein != null) {
      p += s.protein * share;
      pShare += share;
    }
    if (s.w != null) {
      w += s.w * share;
      wShare += share;
    }
  }
  return {
    protein: pShare > 0 ? p / pShare : null,
    proteinCoverage: pShare,
    w: wShare > 0 ? w / wShare : null,
    wCoverage: wShare,
  };
}

export function isStrongBlend(protein: number | null): boolean {
  return protein != null && protein >= STRONG_BLEND_PROTEIN;
}

// ---- Squeeze test ------------------------------------------------------

/** Corrective step sizes scaled to the batch (see WATER_STEP_FRACTION). */
export function adjustSteps(flourG: number): { waterG: number; semolinaG: number } {
  return {
    waterG: Math.max(MIN_WATER_STEP_G, round(flourG * WATER_STEP_FRACTION * 2) / 2),
    semolinaG: Math.max(MIN_SEMOLINA_STEP_G, round(flourG * SEMOLINA_STEP_FRACTION)),
  };
}

/**
 * Next action for a squeeze-test result. `flourG` sizes the correction; the
 * brief's ~500 g reference batch gives ~1 tsp water and ~10 g semolina.
 */
export function squeezeAdvice(state: SqueezeState, flourG = 500, mode: Mode = 'extruded'): SqueezeAdvice {
  const [restLo, restHi] = POWDERY_RETEST_REST_MIN;
  const steps = adjustSteps(flourG);
  if (mode === 'rolled') {
    // Knead test: kneaded for several minutes and rested ~5 min (semolina feels dry at first).
    switch (state) {
      case 'crumbly':
        return {
          state,
          verdict: 'ready',
          title: 'Smooth, firm, barely tacky',
          action: 'Ready. Wrap it and rest, then roll.',
        };
      case 'powdery':
        return {
          state,
          verdict: 'add-water',
          title: "Dry and shaggy, won't come together",
          action: `Rest it ${restLo} minutes first (semolina feels dry until it hydrates). If still shaggy, knead in water ${round(steps.waterG, 1)} g (≈ ${formatTsp(steps.waterG)}) at a time.`,
          waterStepG: steps.waterG,
        };
      case 'sticky':
        return {
          state,
          verdict: 'add-semolina',
          title: 'Sticky: clings to hands and board',
          action: `Too wet to roll. Knead in flour ${steps.semolinaG} g at a time, dusting with semolina.`,
          semolinaStepG: steps.semolinaG,
        };
    }
  }
  switch (state) {
    case 'crumbly':
      return {
        state,
        verdict: 'ready',
        title: 'Slightly crumbly, clumps in hand',
        action: 'Ready. Load the press.',
      };
    case 'powdery':
      return {
        state,
        verdict: 'add-water',
        title: "Dry and powdery, won't clump",
        action: `Add water ${round(steps.waterG, 1)} g (≈ ${formatTsp(steps.waterG)}) at a time, mix, rest ${restLo}–${restHi} min, retest.`,
        waterStepG: steps.waterG,
      };
    case 'sticky':
      return {
        state,
        verdict: 'add-semolina',
        title: 'Smooth sticky ball',
        action: `Too wet for extrusion. Add semolina ${steps.semolinaG} g at a time.`,
        semolinaStepG: steps.semolinaG,
      };
  }
}

// ---- Batch comparison & calibration ------------------------------------

/** Hydration actually reached, counting squeeze-test water and semolina. */
export function achievedHydration(b: Batch): number {
  const flour = b.flourTotalG + b.extraSemolinaG;
  if (flour <= 0) return 0;
  return (eggWaterG(b.eggShelledG, b.yolkG) + b.addedWaterG + b.extraWaterG) / flour;
}

/** The most recent earlier batch in the same mode, if any. */
export function previousBatchSameMode(batch: Batch, all: Batch[]): Batch | undefined {
  let best: Batch | undefined;
  for (const b of all) {
    if (b.id === batch.id || b.mode !== batch.mode) continue;
    if (b.createdAt >= batch.createdAt) continue;
    if (!best || b.createdAt > best.createdAt) best = b;
  }
  return best;
}

export function deltaVsPrevious(batch: Batch, all: Batch[]): BatchDelta | null {
  const prev = previousBatchSameMode(batch, all);
  if (!prev) return null;
  return {
    prevId: prev.id,
    extraWaterG: batch.extraWaterG,
    prevExtraWaterG: prev.extraWaterG,
    extraSemolinaG: batch.extraSemolinaG,
    prevExtraSemolinaG: prev.extraSemolinaG,
    achievedHydration: achievedHydration(batch),
    prevAchievedHydration: achievedHydration(prev),
    rating: batch.rating,
    prevRating: prev.rating,
  };
}

/** e.g. "You added 8 g extra water (last time: 0 g) and rated this batch 4/5 vs 2/5 last time. ..." */
export function describeDelta(d: BatchDelta, unit: Unit): string {
  const water = `You added ${formatAmount(d.extraWaterG, unit)} extra water (last time: ${formatAmount(d.prevExtraWaterG, unit)})`;
  let rating: string;
  if (d.rating != null && d.prevRating != null) {
    rating = `rated this batch ${d.rating}/5 vs ${d.prevRating}/5 last time`;
  } else if (d.rating != null) {
    rating = `rated this batch ${d.rating}/5 (last batch was not rated)`;
  } else {
    rating = 'have not rated this batch yet';
  }
  let out = `${water} and ${rating}.`;
  if (d.extraSemolinaG > 0 || d.prevExtraSemolinaG > 0) {
    out += ` Extra semolina: ${formatAmount(d.extraSemolinaG, unit)} (last time: ${formatAmount(d.prevExtraSemolinaG, unit)}).`;
  }
  out += ` Hydration reached: ${round(d.achievedHydration * 100, 1)} % (last time: ${round(d.prevAchievedHydration * 100, 1)} %).`;
  return out;
}

/**
 * Personal hydration target: the median hydration actually reached by
 * well-rated batches with the same mode, machine and liquid type (egg vs
 * water-only) and a similar flour blend. Median, so one odd batch can't drag it.
 */
export function calibrationFor(
  batches: Batch[],
  key: { mode: Mode; machine: Machine; hasEgg: boolean; blend: Blend },
): Calibration | null {
  const hs = batches
    .filter(
      (b) =>
        b.mode === key.mode &&
        b.machine === key.machine &&
        b.eggShelledG + b.yolkG > 0 === key.hasEgg &&
        blendDistance(b.blend, key.blend) <= CALIBRATION.maxBlendDistance &&
        b.rating != null &&
        b.rating >= CALIBRATION.minRating,
    )
    .map(achievedHydration)
    .filter((h) => h > 0)
    .sort((a, b) => a - b);
  if (hs.length < CALIBRATION.minBatches) return null;
  const mid = Math.floor(hs.length / 2);
  const target = hs.length % 2 ? hs[mid] : (hs[mid - 1] + hs[mid]) / 2;
  return { target, n: hs.length };
}
