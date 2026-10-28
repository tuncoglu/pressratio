import { describe, expect, it } from 'vitest';
import {
  BLEND_PRESETS,
  achievedHydration,
  adjustSteps,
  blendStats,
  doughMassG,
  isStrongBlend,
  pressLoads,
  scaleForLoads,
  sheetFor,
  ravioliPlan,
  blendSum,
  calculate,
  calibrationFor,
  deltaVsPrevious,
  describeDelta,
  eggToShelledG,
  formatAmount,
  formatTsp,
  gToUnit,
  isValidBlend,
  restPlan,
  setShare,
  squeezeAdvice,
  unitToG,
} from './calc';
import type { Batch, Blend, CalcInput } from './types';

const COARSE: Blend = { type00: 0, fineSemolina: 0, coarseSemolina: 100, breadFlour: 0 };

const base: CalcInput = {
  mode: 'extruded',
  egg: { kind: 'shelled', value: 210 },
  yolkG: 0,
  addedWaterG: 0,
  lyeWaterG: 0,
  blend: COARSE,
  machine: 'manual',
  ambientC: null,
};

describe('extruded semolina + egg', () => {
  it('reference case: 210 g shelled egg -> 525 g flour (range 500–550)', () => {
    const r = calculate(base);
    expect(r.status).toBe('ok');
    expect(r.eggWaterG).toBeCloseTo(157.5, 6);
    expect(r.totalWaterG).toBeCloseTo(157.5, 6);
    expect(r.flourTotalG).toBeCloseTo(525, 6);
    expect(r.flourRangeG[0]).toBeCloseTo(500, 6);
    expect(r.flourRangeG[1]).toBeCloseTo(550.7, 1);
    expect(r.hydration).toBeCloseTo(0.3, 9);
  });

  it('adds added water into the water fraction', () => {
    const r = calculate({ ...base, addedWaterG: 10 });
    expect(r.totalWaterG).toBeCloseTo(167.5, 6);
    expect(r.flourTotalG).toBeCloseTo(167.5 / 0.3, 6);
    expect(r.totalLiquidG).toBeCloseTo(220, 6);
  });

  it('splits flour by blend percentages', () => {
    const r = calculate({ ...base, blend: BLEND_PRESETS[1].blend });
    expect(r.flourBreakdownG.type00).toBeCloseTo(367.5, 6);
    expect(r.flourBreakdownG.coarseSemolina).toBeCloseTo(157.5, 6);
    const sum = Object.values(r.flourBreakdownG).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(r.flourTotalG, 6);
  });

  it('is empty with no liquid', () => {
    expect(calculate({ ...base, egg: { kind: 'shelled', value: 0 } }).status).toBe('empty');
  });

  it('water-only dough is flagged as uncalibrated', () => {
    const r = calculate({ ...base, egg: { kind: 'shelled', value: 0 }, addedWaterG: 150 });
    expect(r.status).toBe('ok');
    expect(r.uncalibrated).toContain('WATER_ONLY_HYDRATION');
    expect(calculate(base).uncalibrated).not.toContain('WATER_ONLY_HYDRATION');
  });

  it('warns when a roller is paired with extruder hydration', () => {
    const r = calculate({ ...base, machine: 'roller' });
    expect(r.warnings.map((w) => w.id)).toContain('roller-extruded');
    expect(calculate(base).warnings).toHaveLength(0);
  });

  it('rejects blends that do not sum to 100', () => {
    const r = calculate({ ...base, blend: { ...COARSE, type00: 10 } });
    expect(r.status).toBe('invalid-blend');
  });

});

describe('rolled egg pasta', () => {
  const rolled: CalcInput = { ...base, mode: 'rolled', machine: 'pin' };

  it('classic ratio: 1 large egg (50 g) per 100 g flour = 37.5 %', () => {
    const r = calculate({ ...rolled, egg: { kind: 'count', value: 4 } }); // 200 g egg
    expect(r.flourTotalG).toBeCloseTo(400, 6);
    expect(r.hydration).toBeCloseTo(0.375, 9);
    expect(r.hydrationRange[0]).toBeCloseTo(0.35, 9);
    expect(r.hydrationRange[1]).toBeCloseTo(0.42, 9);
    // the same 210 g of egg wets 420 g of rolled dough but 525 g of pressed dough (wetter target = less flour)
    expect(calculate(rolled).flourTotalG).toBeCloseTo(420, 6);
    expect(calculate(base).flourTotalG).toBeCloseTo(525, 6);
  });
  it('is flagged uncalibrated for hydration and rest, until calibrated', () => {
    expect(calculate(rolled).uncalibrated).toEqual(expect.arrayContaining(['ROLLED_HYDRATION', 'ROLLED_REST']));
    const cal = calculate({ ...rolled, calibration: { target: 0.4, n: 3 } });
    expect(cal.uncalibrated).not.toContain('ROLLED_HYDRATION');
    expect(cal.uncalibrated).toContain('ROLLED_REST');
    expect(cal.flourTotalG).toBeCloseTo(157.5 / 0.4, 6);
  });
  it('has a smooth-ball texture target and no roller warning', () => {
    const r = calculate({ ...rolled, machine: 'roller' });
    expect(r.textureTarget).toContain('smooth, firm ball');
    expect(r.warnings.map((w) => w.id)).not.toContain('roller-extruded');
  });
  it('rest: 30 min plain, 60 min all-coarse semolina; temperature shifts as before', () => {
    const plain = { type00: 100, fineSemolina: 0, coarseSemolina: 0, breadFlour: 0 };
    expect(restPlan(plain, 20, 'rolled')).toMatchObject({ minMin: 30, maxMin: 45 });
    expect(restPlan(COARSE, 20, 'rolled')).toMatchObject({ minMin: 60, maxMin: 75 });
    expect(restPlan(COARSE, 15, 'rolled').minMin).toBe(70);
    expect(restPlan(COARSE, 30, 'rolled').minMin).toBe(55);
    expect(restPlan(COARSE, 20, 'rolled').notes.join(' ')).toContain('Wrapping stops a dry skin');
  });
  it('warns that an all-coarse dough rolls gritty; not for blends', () => {
    expect(calculate(rolled).warnings.map((w) => w.id)).toContain('rolled-all-coarse');
    expect(calculate({ ...rolled, blend: BLEND_PRESETS[2].blend }).warnings.map((w) => w.id)).not.toContain(
      'rolled-all-coarse',
    );
  });
  it('knead test: wait 5 min before adding water; sticky -> knead in flour', () => {
    const dry = squeezeAdvice('powdery', 420, 'rolled');
    expect(dry.action).toContain('Rest it 5 minutes first');
    expect(dry.waterStepG).toBe(4);
    expect(squeezeAdvice('crumbly', 420, 'rolled').action).toBe('Ready. Wrap it and rest, then roll.');
    const wet = squeezeAdvice('sticky', 420, 'rolled');
    expect(wet.verdict).toBe('add-semolina');
    expect(wet.semolinaStepG).toBe(8);
    // the pressed-dough wording is unchanged
    expect(squeezeAdvice('crumbly', 420).action).toBe('Ready. Load the press.');
  });
  it('sheet area from dough weight and thickness', () => {
    // 630 g dough at 1 mm, 1.1 g/cm³ -> 5727 cm²
    const s = sheetFor(630, 1);
    expect(s.areaCm2).toBeCloseTo(5727.27, 1);
    expect(s.sheets).toBeCloseTo(3.58, 2); // 40 x 40 cm sheets
    expect(sheetFor(630, 0.5).areaCm2).toBeCloseTo(2 * s.areaCm2, 6); // half as thick = double the area
    expect(sheetFor(0, 1).areaCm2).toBe(0);
  });
});

describe('egg conversion', () => {
  it('in-shell -> shelled at 0.90', () => {
    expect(eggToShelledG({ kind: 'inShell', value: 233.33 })).toBeCloseTo(210, 1);
  });
  it('egg count assumes 50 g shelled per (US) large egg by default', () => {
    expect(eggToShelledG({ kind: 'count', value: 4 })).toBe(200);
  });
  it('EU L eggs are ~61 g shelled, so 4 of them need ~22 % more flour', () => {
    expect(eggToShelledG({ kind: 'count', value: 4, size: 'euL' })).toBe(244);
    const us = calculate({ ...base, egg: { kind: 'count', value: 4 } }).flourTotalG;
    const eu = calculate({ ...base, egg: { kind: 'count', value: 4, size: 'euL' } }).flourTotalG;
    expect(eu / us).toBeCloseTo(1.22, 2);
  });
  it('egg-input error: counted ±8 %, in-shell ±2 %, weighed = scale resolution', () => {
    const counted = calculate({ ...base, egg: { kind: 'count', value: 4.2 } }).eggError!; // 210 g
    expect(counted.fraction).toBe(0.08);
    expect(counted.flourG).toBeCloseTo(42, 6); // 8 % of 525 g
    expect(counted.weighedFlourG).toBeCloseTo(2.5, 6); // 1 g of 210 g
    const shell = calculate({ ...base, egg: { kind: 'inShell', value: 700 / 3 } }).eggError!;
    expect(shell.flourG).toBeCloseTo(10.5, 6);
    const weighed = calculate(base).eggError!;
    expect(weighed.fraction).toBeCloseTo(1 / 210, 9);
    expect(weighed.flourG).toBeCloseTo(2.5, 6);
  });
  it('egg-input error only scales the egg share of the water', () => {
    // 157.5 g egg water + 157.5 g added water: half the flour is unaffected by the egg
    const r = calculate({ ...base, egg: { kind: 'count', value: 4.2 }, addedWaterG: 157.5 });
    expect(r.eggError!.flourG).toBeCloseTo(42, 6);
    expect(calculate({ ...base, egg: { kind: 'shelled', value: 0 }, addedWaterG: 150 }).eggError).toBeNull();
  });
  it('alkaline flour error follows the 35 % egg scaling', () => {
    const r = calculate({ ...base, mode: 'alkaline', egg: { kind: 'count', value: 3.5 } }); // 175 g -> 500 g
    expect(r.eggError!.flourG).toBeCloseTo(40, 6);
  });
  it('extra yolks count at ~52 % water', () => {
    const r = calculate({ ...base, yolkG: 40 });
    expect(r.eggWaterG).toBeCloseTo(157.5 + 20.8, 6);
    expect(r.flourTotalG).toBeCloseTo((157.5 + 20.8) / 0.3, 6);
    expect(r.warnings.map((w) => w.id)).toContain('yolk-fat');
  });
  it('clamps negatives and NaN to 0', () => {
    expect(eggToShelledG({ kind: 'shelled', value: -5 })).toBe(0);
    expect(eggToShelledG({ kind: 'shelled', value: NaN })).toBe(0);
  });
  it('in-shell input flows through to flour', () => {
    // 700/3 g in shell -> 210 g shelled -> 525 g flour
    const r = calculate({ ...base, egg: { kind: 'inShell', value: 700 / 3 } });
    expect(r.eggShelledG).toBeCloseTo(210, 6);
    expect(r.flourTotalG).toBeCloseTo(525, 6);
  });
});

describe('alkaline noodles', () => {
  const alk: CalcInput = {
    ...base,
    mode: 'alkaline',
    blend: BLEND_PRESETS[1].blend,
    egg: { kind: 'shelled', value: 175 },
  };

  it('scales from egg at 35 % of flour and shows baker percentages', () => {
    const r = calculate(alk);
    expect(r.flourTotalG).toBeCloseTo(500, 6);
    const by = Object.fromEntries(r.ingredients.map((i) => [i.label.trim(), i]));
    expect(by['Baked baking soda (sodium carbonate)'].grams).toBeCloseTo(7.5, 6);
    expect(by['Salt'].grams).toBeCloseTo(3.5, 6);
    expect(by['Egg (shelled)'].pct).toBeCloseTo(35, 6);
  });

  it('starts added water at the low end (10 %) with a 10–17 % range', () => {
    const r = calculate(alk);
    expect(r.addedWaterG).toBeCloseTo(50, 6);
    expect(r.suggestedAddedWaterG![0]).toBeCloseTo(50, 6);
    expect(r.suggestedAddedWaterG![1]).toBeCloseTo(85, 6);
  });

  it("respects the user's added water", () => {
    const r = calculate({ ...alk, addedWaterG: 70 });
    expect(r.addedWaterG).toBe(70);
    expect(r.hydration).toBeCloseTo((175 * 0.75 + 70) / 500, 6);
  });

  it('shows the baking-soda weight before baking (x 168/106)', () => {
    const soda = calculate(alk).ingredients.find((i) => i.label.startsWith('Baked'))!;
    expect(soda.note).toBe('= 11.9 g baking soda before baking');
  });

  it('lye water replaces soda, warns, and is marked unvalidated', () => {
    const r = calculate({ ...alk, lyeWaterG: 2 });
    expect(r.lyeUnvalidated).toBe(true);
    expect(r.warnings.map((w) => w.id)).toContain('lye-unvalidated');
    expect(r.uncalibrated).toContain('LYE_WATER_CARBONATE_FRACTION');
    // 2 g x 0.25 alkali / 500 g flour = 0.1 %
    expect(r.lyeAlkaliPct).toBeCloseTo(0.1, 9);
    expect(r.ingredients.some((i) => i.label.startsWith('Baked baking soda'))).toBe(false);
    expect(r.totalLiquidG).toBeCloseTo(175 + 50 + 2, 6);
  });

  it('ignores lye outside alkaline mode', () => {
    const r = calculate({ ...base, lyeWaterG: 5 });
    expect(r.lyeWaterG).toBe(0);
    expect(r.lyeUnvalidated).toBe(false);
  });

  it('calibration sets the added water from the proven hydration', () => {
    // 175 g egg -> 131.25 g egg water, 500 g flour; 32 % target = 160 g water -> 28.75 g added
    const r = calculate({ ...alk, calibration: { target: 0.32, n: 3 } });
    expect(r.addedWaterG).toBeCloseTo(28.75, 6);
    expect(r.hydration).toBeCloseTo(0.32, 9);
    expect(r.calibration).toEqual({ target: 0.32, n: 3 });
    expect(r.ingredients.find((i) => i.label === 'Added water')!.note).toBe('your calibrated target');
    expect(r.warnings.map((w) => w.id)).not.toContain('alkaline-wet-for-press');
  });
  it("the user's own added water beats calibration", () => {
    const r = calculate({ ...alk, addedWaterG: 60, calibration: { target: 0.32, n: 3 } });
    expect(r.addedWaterG).toBe(60);
    expect(r.calibration).toBeNull();
  });
  it('a calibrated target below the egg water never goes negative', () => {
    expect(calculate({ ...alk, calibration: { target: 0.2, n: 2 } }).addedWaterG).toBe(0);
  });
  it('alkaline batches calibrate separately from extruded ones', () => {
    const mk = (id: string, mode: 'extruded' | 'alkaline', extra: number) => ({
      id, createdAt: `2026-10-0${id}T10:00:00Z`, mode, machine: 'manual' as const, die: '', blend: BLEND_PRESETS[1].blend,
      eggShelledG: 175, yolkG: 0, addedWaterG: 50, lyeWaterG: 0, ambientC: null, flourTotalG: 500, hydration: 0.3625,
      restMinMin: 25, restMaxMin: 35, extraWaterG: extra, extraSemolinaG: 0, rating: 5, notes: '',
    });
    const key = { mode: 'alkaline' as const, machine: 'manual' as const, hasEgg: true, blend: BLEND_PRESETS[1].blend };
    const batches = [mk('1', 'alkaline', 0), mk('2', 'alkaline', 10), mk('3', 'extruded', 40)];
    const cal = calibrationFor(batches, key)!;
    expect(cal.n).toBe(2);
    expect(cal.target).toBeCloseTo((181.25 + 0.5 * 10) / 500, 9); // median of 0.3625 and 0.3825
  });
  it('needs an egg weight', () => {
    expect(calculate({ ...alk, egg: { kind: 'shelled', value: 0 } }).status).toBe('empty');
  });

  it('flags that the reference recipe is wetter than the extrusion band on a press', () => {
    const r = calculate(alk); // 36.25 % hydration
    expect(r.hydration).toBeCloseTo(0.3625, 6);
    expect(r.warnings.map((w) => w.id)).toContain('alkaline-wet-for-press');
    const text = r.warnings.find((w) => w.id === 'alkaline-wet-for-press')!.text;
    expect(text).toContain('28–34 % total water');
    expect(text).toContain('above that range');
    expect(text).toContain('≈ 19 g added water');
    expect(calculate({ ...alk, machine: 'roller' }).warnings.map((w) => w.id)).not.toContain('alkaline-wet-for-press');
  });
});

describe('rest time', () => {
  const mixed = BLEND_PRESETS[1].blend; // 30 % coarse
  it('100 % coarse: 30–40 min at room temp (brief endpoint)', () => {
    const p = restPlan(COARSE, 20);
    expect([p.minMin, p.maxMin]).toEqual([30, 40]);
  });
  it('0 % coarse: 20–30 min (brief endpoint)', () => {
    const p = restPlan({ type00: 100, fineSemolina: 0, coarseSemolina: 0, breadFlour: 0 }, null);
    expect([p.minMin, p.maxMin]).toEqual([20, 30]);
  });
  it('scales continuously with coarse share, rounded to 5 min (no cliff at 50 %)', () => {
    expect(restPlan(mixed, 20).minMin).toBe(25); // 23 -> 25
    expect(restPlan(setShare(COARSE, 'coarseSemolina', 49), 20).minMin).toBe(25);
    expect(restPlan(setShare(COARSE, 'coarseSemolina', 50), 20).minMin).toBe(25);
    expect(restPlan(setShare(COARSE, 'coarseSemolina', 10), 20).minMin).toBe(20);
  });
  it('cold adds 10 min, warm subtracts 5', () => {
    expect(restPlan(COARSE, 15).minMin).toBe(40);
    expect(restPlan(COARSE, 30).minMin).toBe(25);
  });
  it('thresholds are exclusive (18 and 26 are neutral)', () => {
    expect(restPlan(COARSE, 18).minMin).toBe(30);
    expect(restPlan(COARSE, 26).minMin).toBe(30);
  });
  it('hold limit is 2 h, dropping to 1 h above 32 °C (USDA)', () => {
    expect(restPlan(COARSE, 20).holdLimitH).toBe(2);
    expect(restPlan(COARSE, 32).holdLimitH).toBe(2);
    expect(restPlan(COARSE, 33).holdLimitH).toBe(1);
    expect(restPlan(COARSE, 33).notes.join(' ')).toContain('no more than 1 hour');
  });
});

describe('squeeze test', () => {
  it('crumbly -> ready', () => {
    const a = squeezeAdvice('crumbly');
    expect(a.verdict).toBe('ready');
    expect(a.action).toBe('Ready. Load the press.');
  });
  it('powdery -> add water; ~1 tsp for the ~500 g reference batch', () => {
    const a = squeezeAdvice('powdery', 525);
    expect(a.verdict).toBe('add-water');
    expect(a.waterStepG).toBe(5.5);
    expect(a.action).toBe('Add water 5.5 g (≈ 1 tsp) at a time, mix, rest 5–10 min, retest.');
  });
  it('sticky -> add semolina; ~10 g for the reference batch', () => {
    const a = squeezeAdvice('sticky', 525);
    expect(a.verdict).toBe('add-semolina');
    expect(a.action).toBe('Too wet for extrusion. Add semolina 11 g at a time.');
    expect(squeezeAdvice('sticky', 500).semolinaStepG).toBe(10);
  });
  it('steps scale with batch size so each moves hydration about the same', () => {
    expect(adjustSteps(200)).toEqual({ waterG: 2, semolinaG: 4 });
    expect(adjustSteps(1000)).toEqual({ waterG: 10, semolinaG: 20 });
    expect(adjustSteps(50)).toEqual({ waterG: 1, semolinaG: 2 }); // floors
    // one water step = +1 hydration point regardless of batch size
    for (const f of [200, 500, 1000]) expect(adjustSteps(f).waterG / f).toBeCloseTo(0.01, 2);
  });
  it('formats teaspoons to the nearest quarter', () => {
    expect(formatTsp(5)).toBe('1 tsp');
    expect(formatTsp(2.5)).toBe('½ tsp');
    expect(formatTsp(6.25)).toBe('1¼ tsp');
    expect(formatTsp(0.2)).toBe('¼ tsp');
  });
});

describe('blend editing', () => {
  it('always sums to 100 and stays non-negative', () => {
    let b: Blend = { type00: 40, fineSemolina: 20, coarseSemolina: 30, breadFlour: 10 };
    for (const [k, v] of [
      ['type00', 33],
      ['coarseSemolina', 77],
      ['breadFlour', 5],
      ['fineSemolina', 100],
      ['type00', 0],
      ['coarseSemolina', 13],
    ] as const) {
      b = setShare(b, k, v);
      expect(blendSum(b)).toBe(100);
      expect(isValidBlend(b)).toBe(true);
    }
  });
  it('scales the others proportionally', () => {
    const b = setShare({ type00: 50, fineSemolina: 0, coarseSemolina: 50, breadFlour: 0 }, 'type00', 20);
    expect(b).toEqual({ type00: 20, fineSemolina: 0, coarseSemolina: 80, breadFlour: 0 });
  });
  it('handles a flour taking 100 % and then coming back down', () => {
    let b = setShare(COARSE, 'coarseSemolina', 100);
    expect(b.coarseSemolina).toBe(100);
    b = setShare(b, 'coarseSemolina', 60);
    expect(blendSum(b)).toBe(100);
    expect(b.type00).toBe(40);
  });
  it('presets are valid', () => {
    for (const p of BLEND_PRESETS) expect(isValidBlend(p.blend)).toBe(true);
  });
});

describe('dough, press loads and flours', () => {
  it('dough mass = flour + liquid (+ salt and alkali)', () => {
    expect(doughMassG(calculate(base))).toBeCloseTo(525 + 210, 6);
    const alk = calculate({ ...base, mode: 'alkaline', egg: { kind: 'shelled', value: 175 } });
    // 500 flour + 175 egg + 50 water + 3.5 salt + 7.5 soda
    expect(doughMassG(alk)).toBeCloseTo(736, 6);
  });
  it('counts Bigolaro loads (mod. 8 = 700 g, mod. B = 480 g)', () => {
    expect(pressLoads(735, 700)).toEqual({ loads: 1.05, fullLoads: 2 });
    expect(pressLoads(700, 700).fullLoads).toBe(1);
    expect(pressLoads(735, 480).fullLoads).toBe(2);
    expect(pressLoads(0, 700).fullLoads).toBe(0);
  });
  it('scaling all inputs by scaleForLoads fills exactly n loads', () => {
    const r = calculate(base);
    const k = scaleForLoads(doughMassG(r), 700, 2);
    const scaled = calculate({ ...base, egg: { kind: 'shelled', value: 210 * k } });
    expect(doughMassG(scaled)).toBeCloseTo(1400, 6);
  });
  it('blend protein is share-weighted over known flours', () => {
    const s = blendStats(BLEND_PRESETS[1].blend, {
      type00: { protein: 13.5, w: 340 },
      coarseSemolina: { protein: 12.5 },
    });
    expect(s.protein).toBeCloseTo(13.2, 9);
    expect(s.proteinCoverage).toBeCloseTo(1, 9);
    expect(s.w).toBe(340);
    expect(s.wCoverage).toBeCloseTo(0.7, 9);
    expect(isStrongBlend(s.protein)).toBe(false);
    expect(isStrongBlend(13.5)).toBe(true);
    expect(blendStats(COARSE, {}).protein).toBeNull();
  });
});

describe('ravioli filling guide', () => {
  it('two layers of sheet per ravioli: 5 cm at 0.8 mm = 4.4 g of dough', () => {
    const p = ravioliPlan(630, 0.8, 5, 'main')!;
    expect(p.doughPerG).toBeCloseTo(4.4, 9); // 2 x 25 cm² x 0.08 cm x 1.1
    expect(p.count).toBe(143);
  });
  it('filling scales with face area: ~1 tsp (5 g) at 5 cm, 3.2 g at 4 cm, 7.2 g at 6 cm', () => {
    expect(ravioliPlan(630, 0.8, 5, 'main')!.fillingPerG).toBeCloseTo(5, 9);
    expect(ravioliPlan(630, 0.8, 4, 'main')!.fillingPerG).toBeCloseTo(3.2, 9);
    expect(ravioliPlan(630, 0.8, 6, 'main')!.fillingPerG).toBeCloseTo(7.2, 9);
  });
  it('filling : dough is close to 1 : 1 at 5 cm and 0.8 mm', () => {
    expect(ravioliPlan(630, 0.8, 5, 'main')!.fillingToDough).toBeCloseTo(1.14, 2);
  });
  it('totals and servings (135 g main, 90 g starter)', () => {
    const p = ravioliPlan(630, 0.8, 5, 'main')!;
    expect(p.fillingTotalG).toBeCloseTo(143 * 5, 6);
    expect(p.pieceG).toBeCloseTo(9.4, 9);
    expect(p.servings).toBeCloseTo((143 * 9.4) / 135, 6);
    expect(p.piecesPerServing).toBeCloseTo(143 / p.servings, 9);
    expect(ravioliPlan(630, 0.8, 5, 'starter')!.servings).toBeCloseTo((143 * 9.4) / 90, 6);
  });
  it("the user's own filling weight overrides the estimate", () => {
    const p = ravioliPlan(630, 0.8, 5, 'main', 6)!;
    expect(p.fillingPerG).toBe(6);
    expect(p.fillingTotalG).toBeCloseTo(143 * 6, 6);
    expect(ravioliPlan(630, 0.8, 5, 'main', 0)!.fillingPerG).toBeCloseTo(5, 9);
  });
  it('thicker sheets mean fewer ravioli; bad inputs give null', () => {
    expect(ravioliPlan(630, 1.5, 5, 'main')!.count).toBeLessThan(ravioliPlan(630, 0.8, 5, 'main')!.count);
    expect(ravioliPlan(0, 0.8, 5, 'main')).toBeNull();
    expect(ravioliPlan(630, 0.8, 0, 'main')).toBeNull();
  });
});

describe('units', () => {
  it('round-trips grams <-> ounces', () => {
    expect(unitToG(gToUnit(525, 'oz'), 'oz')).toBeCloseTo(525, 9);
    expect(gToUnit(525, 'g')).toBe(525);
  });
  it('formats amounts', () => {
    expect(formatAmount(525, 'g')).toBe('525 g');
    expect(formatAmount(7.5, 'g')).toBe('7.5 g');
    expect(formatAmount(28.349523125, 'oz')).toBe('1 oz');
  });
});

describe('batch delta', () => {
  const mk = (id: string, createdAt: string, extra: number, rating: number | null, mode: Batch['mode'] = 'extruded'): Batch => ({
    id,
    createdAt,
    mode,
    machine: 'manual',
    die: 'Spaghetti',
    blend: COARSE,
    eggShelledG: 210,
    yolkG: 0,
    addedWaterG: 0,
    lyeWaterG: 0,
    ambientC: null,
    flourTotalG: 525,
    hydration: 0.3,
    restMinMin: 30,
    restMaxMin: 40,
    extraWaterG: extra,
    extraSemolinaG: 0,
    rating,
    notes: '',
  });
  const a = mk('a', '2026-10-01T10:00:00Z', 0, 2);
  const alk = mk('x', '2026-10-05T10:00:00Z', 0, 5, 'alkaline');
  const b = mk('b', '2026-10-10T10:00:00Z', 8, 4);
  const all = [a, alk, b];

  it('compares against the previous batch of the same mode only', () => {
    const d = deltaVsPrevious(b, all)!;
    expect(d.prevId).toBe('a');
    expect(d.extraWaterG).toBe(8);
    expect(d.prevRating).toBe(2);
  });
  it('is null for the first batch in a mode', () => {
    expect(deltaVsPrevious(a, all)).toBeNull();
    expect(deltaVsPrevious(alk, all)).toBeNull();
  });
  it('describes the delta', () => {
    expect(describeDelta(deltaVsPrevious(b, all)!, 'g')).toBe(
      'You added 8 g extra water (last time: 0 g) and rated this batch 4/5 vs 2/5 last time. Hydration reached: 31.5 % (last time: 30 %).',
    );
  });
  it('achieved hydration counts squeeze-test water and semolina', () => {
    expect(achievedHydration(b)).toBeCloseTo(165.5 / 525, 9);
    expect(achievedHydration({ ...b, extraSemolinaG: 25 })).toBeCloseTo(165.5 / 550, 9);
  });
  it('calibration: median achieved hydration of well-rated, matching batches', () => {
    const key = { mode: 'extruded' as const, machine: 'manual' as const, hasEgg: true, blend: COARSE };
    const good1 = mk('g1', '2026-10-11T10:00:00Z', 5.25, 4); // 31 %
    const good2 = mk('g2', '2026-10-12T10:00:00Z', 10.5, 5); // 32 %
    const good3 = mk('g3', '2026-10-13T10:00:00Z', 0, 4); // 30 %
    expect(calibrationFor([a, good1], key)).toBeNull(); // only one good batch
    const cal = calibrationFor([a, good1, good2, good3, { ...good2, id: 'e', machine: 'electric' }], key)!;
    expect(cal.n).toBe(3);
    expect(cal.target).toBeCloseTo(0.31, 9);
    expect(calibrationFor([good1, good2], { ...key, hasEgg: false })).toBeNull();
    // 70/30 is 70 points away from 100 % coarse: different flour, no calibration
    expect(calibrationFor([good1, good2], { ...key, blend: BLEND_PRESETS[1].blend })).toBeNull();
    // 90 % coarse / 10 % 00 is close enough
    expect(calibrationFor([good1, good2], { ...key, blend: setShare(COARSE, 'coarseSemolina', 90) })).not.toBeNull();
  });
  it('a calibrated target replaces the default and the water-only placeholder', () => {
    const cal = { target: 0.32, n: 3 };
    const r = calculate({ ...base, calibration: cal });
    expect(r.flourTotalG).toBeCloseTo(157.5 / 0.32, 6);
    expect(r.calibration).toEqual(cal);
    const w = calculate({ ...base, egg: { kind: 'shelled', value: 0 }, addedWaterG: 150, calibration: cal });
    expect(w.uncalibrated).not.toContain('WATER_ONLY_HYDRATION');
  });
  it('handles missing ratings', () => {
    const unrated = { ...b, rating: null };
    expect(describeDelta(deltaVsPrevious(unrated, [a, unrated])!, 'g')).toContain('have not rated');
    const prevUnrated = { ...a, rating: null };
    expect(describeDelta(deltaVsPrevious(b, [prevUnrated, b])!, 'g')).toContain('last batch was not rated');
  });
});
