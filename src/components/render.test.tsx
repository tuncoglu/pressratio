import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BLEND_PRESETS } from '../calc/calc';
import type { Batch } from '../calc/types';
import { DEFAULT_FORM } from '../storage';
import { BatchLog } from './BatchLog';
import { Calculator } from './Calculator';

const noop = () => {};
// React SSR separates adjacent text nodes with <!-- -->; drop them so assertions read naturally.
const html = (node: ReactElement) => renderToString(node).replace(/<!-- -->/g, '');
const render = (form = DEFAULT_FORM, unit: 'g' | 'oz' = 'g', batches: Batch[] = []) =>
  html(
    <Calculator form={form} setForm={noop} unit={unit} batches={batches} activeBatch={undefined} onStart={noop} onLogAdjust={noop} onOpenLog={noop} />,
  );

const mk = (id: string, createdAt: string, extra: number, rating: number): Batch => ({
  id, createdAt, mode: 'extruded', machine: 'manual', die: 'Spaghetti', blend: DEFAULT_FORM.blend,
  eggShelledG: 210, yolkG: 0, addedWaterG: 0, lyeWaterG: 0, ambientC: null, flourTotalG: 525, hydration: 0.3,
  restMinMin: 30, restMaxMin: 40, extraWaterG: extra, extraSemolinaG: 0, rating, notes: '',
});

describe('render smoke tests', () => {
  it('default extruded case shows 525 g flour, care note and rest', () => {
    const out = render();
    expect(out).toContain('525 g');
    expect(out).toContain('Bronze dies and chambers are copper alloys');
    expect(out).toContain('30–40 min');
    expect(out).toContain('Adjust — squeeze test');
  });

  it('in-shell input shows both numbers', () => {
    const out = render({ ...DEFAULT_FORM, eggKind: 'inShell', eggValue: 700 / 3 });
    expect(out).toContain('in shell');
    expect(out).toContain('210 g shelled');
  });

  it('ounce mode renders ounces', () => {
    expect(render(DEFAULT_FORM, 'oz')).toContain('18.52 oz');
  });

  it('alkaline mode shows lye safety text and baker percentages', () => {
    const out = render({ ...DEFAULT_FORM, mode: 'alkaline', eggValue: 175, blend: BLEND_PRESETS[1].blend, lyeWaterG: 2 });
    expect(out).toContain('NOT the same as industrial sodium hydroxide');
    expect(out).toContain('corrode aluminium');
    expect(out).toContain('Uncalibrated values in this result');
    expect(out).toContain("Baker&#x27;s percentages");
    expect(out).toContain('unvalidated');
  });

  it('roller + extruded shows a warning', () => {
    const out = render({ ...DEFAULT_FORM, machine: 'roller' });
    expect(out).toContain('not for extruded dough');
  });

  it('offers a calibrated target once two matching batches are rated 4+', () => {
    const good = [mk('g1', '2026-10-11T10:00:00Z', 5.25, 4), mk('g2', '2026-10-12T10:00:00Z', 5.25, 5)];
    const out = render(DEFAULT_FORM, 'g', good);
    expect(out).toContain('Use my calibrated target: 31 % hydration');
    expect(out).toContain('508 g'); // 157.5 / 0.31
    expect(render(DEFAULT_FORM, 'g', good.slice(0, 1))).not.toContain('calibrated target');
  });

  it('alkaline mode: published range note, then calibrated added water after two good batches', () => {
    const alkForm = { ...DEFAULT_FORM, mode: 'alkaline' as const, eggValue: 175, blend: BLEND_PRESETS[1].blend };
    const before = render(alkForm);
    expect(before).toContain('28–34 % total water');
    expect(before).not.toContain('calibrated target');
    const alk = (id: string, day: string, extra: number): Batch => ({
      ...mk(id, `2026-10-${day}T10:00:00Z`, extra, 5),
      mode: 'alkaline', blend: BLEND_PRESETS[1].blend, eggShelledG: 175, addedWaterG: 50, flourTotalG: 500,
    });
    const out = render(alkForm, 'g', [alk('a1', '11', 0), alk('a2', '12', 0)]);
    expect(out).toContain('Use my calibrated target: 36.3 % hydration');
    expect(out).toContain('Median of 2 alkaline batches');
    expect(out).not.toContain('28–34 % total water');
    expect(out).toContain('your calibrated target');
    expect(out).not.toContain('Start low');
    // indentation is CSS, not preserved whitespace, so the label column can wrap
    expect(out).not.toContain('white-space:pre');
    expect(out).toContain('<td class="indent">Type 00</td>');
  });

  it('rolled mode: pin, shape, sheet size, knead test, no press UI', () => {
    const form = { ...DEFAULT_FORM, mode: 'rolled' as const, machine: 'pin' as const };
    const out = render(form);
    expect(out).toContain('Rolled egg pasta (ribbons, ravioli, lasagne)');
    expect(out).not.toContain('Rolled egg pasta (coming soon)');
    expect(out).toContain('<legend>Rolling</legend>');
    expect(out).toContain('Rolling pin');
    expect(out).toContain('Ribbons (tagliatelle, fettuccine, pappardelle)');
    expect(out).toContain('Roll to about 1 mm (range 0.8–1.2 mm)');
    expect(out).toContain('Tagliolini 3.5 mm');
    // 210 g egg -> 420 g flour at 37.5 %; dough 630 g
    expect(out).toContain('420 g');
    expect(out).toContain('37.5 %');
    expect(out).toContain('630 g dough → about 3.6 sheets of 40 × 40 cm');
    expect(out).toContain('Rest <span class="badge badge-warn"');
    expect(out).toContain('60–75 min');
    expect(out).toContain('Before you roll');
    expect(out).toContain('Adjust — knead test');
    expect(out).toContain('Smooth and firm');
    // pressed-dough UI is gone
    expect(out).not.toContain('Before you press');
    expect(out).not.toContain('Bigolaro model');
    expect(out).not.toContain('Care note');
    expect(out).not.toContain('dough = ');
    expect(out).toContain('An all-coarse-semolina dough is slow to hydrate');
  });

  it('ravioli shape shows the filling guide; other shapes do not', () => {
    const f = { ...DEFAULT_FORM, mode: 'rolled' as const, machine: 'pin' as const };
    const out = render({ ...f, rollShape: 'ravioli' });
    expect(out).toContain('<legend>Ravioli filling</legend>');
    expect(out).toContain('≈ 143 ravioli (5 cm) need 715 g of filling');
    expect(out).toContain('5 g (≈ 1 tsp)');
    expect(out).toContain('4.4 g (two layers at 0.8 mm)');
    expect(out).toContain('1.1 : 1');
    expect(out).toContain('Main course (135 g per person)');
    expect(out).toContain('uncalibrated');
    expect(render({ ...f, rollShape: 'ribbons' })).not.toContain('Ravioli filling');
    expect(render({ ...f, rollShape: 'lasagne' })).not.toContain('Ravioli filling');
    expect(render({ ...DEFAULT_FORM, rollShape: 'ravioli' })).not.toContain('Ravioli filling'); // not rolled mode
  });

  it('ravioli guide uses your own filling weight and drops the badge on that row', () => {
    const f = { ...DEFAULT_FORM, mode: 'rolled' as const, machine: 'pin' as const, rollShape: 'ravioli' as const };
    const out = render({ ...f, fillingG: 6, ravioliCm: 4 });
    expect(out).toContain('6 g (≈ 1¼ tsp)');
    expect(out).toContain('(4 cm)');
  });

  it('rolled mode: lasagne and ravioli thicknesses follow the shape', () => {
    const f = { ...DEFAULT_FORM, mode: 'rolled' as const, machine: 'pin' as const };
    expect(render({ ...f, rollShape: 'ravioli' })).toContain('Roll to about 0.8 mm');
    const lasagne = render({ ...f, rollShape: 'lasagne' });
    expect(lasagne).toContain('Roll to about 1.5 mm (range 1–2 mm)');
    expect(lasagne).toContain('sources disagree');
    // 630 g dough at 1.5 mm -> 3818 cm² = 2.4 sheets of 40 x 40 cm
    expect(lasagne).toContain('630 g dough → about 2.4 sheets of 40 × 40 cm');
  });

  it('rolled mode offers a calibrated target from rolled batches only', () => {
    const f = { ...DEFAULT_FORM, mode: 'rolled' as const, machine: 'pin' as const };
    const rb = (id: string, day: string, extra: number): Batch => ({
      ...mk(id, `2026-10-${day}T10:00:00Z`, extra, 5),
      mode: 'rolled', machine: 'pin', flourTotalG: 420, hydration: 0.375,
    });
    const out = render(f, 'g', [rb('r1', '11', 0), rb('r2', '12', 0), mk('x', '2026-10-13T10:00:00Z', 5, 5)]);
    expect(out).toContain('Median of 2 rolled batches');
    expect(out).toContain('37.5 % hydration');
    expect(render(f, 'g', [mk('x', '2026-10-13T10:00:00Z', 5, 5)])).not.toContain('calibrated target');
  });

  it('egg count shows the size it assumes', () => {
    const out = render({ ...DEFAULT_FORM, eggKind: 'count', eggValue: 4, eggSize: 'euL' });
    expect(out).toContain('244 g shelled');
    expect(out).toContain('EU L (63–73 g)');
  });

  it('counted eggs: shows the flour error and offers weighing', () => {
    const out = render({ ...DEFAULT_FORM, eggKind: 'count', eggValue: 4.2 });
    expect(out).toContain('I weighed them (shelled)');
    expect(out).toContain('±42 g of flour from counted eggs');
    expect(out).toContain('cuts this to about ±2.5 g');
    expect(out).toContain('Weigh shelled eggs instead');
  });

  it('weighed eggs: confirms precision, no weigh prompts', () => {
    const out = render();
    expect(out).toContain('Egg weighed ✓');
    expect(out).toContain('±2.5 g of flour');
    expect(out).not.toContain('I weighed them');
    expect(out).not.toContain('Weigh shelled eggs instead');
  });

  it('Bigolaro mod. 8: same die family, bigger loads', () => {
    const out = render({ ...DEFAULT_FORM, pressModel: '8', dieId: '8', die: 'N°8 Spaghetti Ø2.5 mm' });
    expect(out).toContain('mod. 8°: 700 g dough per load');
    expect(out).toContain('N°10 Bigoli Ø3.0 mm (included)');
    expect(out).toContain('Paccheri Ø25 mm, wall 1.4 mm');
    expect(out).toContain('735 g dough = 1.05 loads');
    expect(out).toContain('Scale to 1 full load');
    expect(out).toContain('Scale to 2 full loads');
    expect(out).toContain('Thin die: these need the most force');
  });

  it('defaults to the owner\'s mod. B: 480 g loads, bigoli die', () => {
    const out = render();
    expect(out).toContain('735 g dough = 1.53 loads');
    expect(out).toContain('of your mod. B (480 g per load)');
    expect(out).toContain('Scale to 1 full load');
    expect(out).toContain('Scale to 2 full loads');
    expect(out).toMatch(/<option value="10" selected="">N°10 Bigoli Ø3.0 mm \(included\)/);
  });

  it('no press model: no load panel, small-model dies', () => {
    const out = render({ ...DEFAULT_FORM, pressModel: null, dieId: 'bigoli' });
    expect(out).not.toContain('dough =');
    expect(out).toContain('Gargati (rigatoni) (included)');
    expect(out).toContain('Tagliolini (special order)');
  });

  it('electric Lillodue hides dies it cannot take', () => {
    const lillo = render({ ...DEFAULT_FORM, machine: 'electric', electricModel: 'lillodue', dieId: '8' });
    expect(lillo).not.toContain('Orecchiette');
    expect(lillo).toContain('N°200 Celentani / amori Ø7.8 mm (PTFE)');
    expect(render({ ...DEFAULT_FORM, machine: 'electric', electricModel: 'pm96', dieId: '8' })).toContain('Orecchiette');
  });

  it('Shipton flours: specs, blend protein and strong-blend note', () => {
    const coarse = render();
    expect(coarse).toContain('Shipton Organic Semolina (507)');
    expect(coarse).toContain('Blend: 12.5 % protein');
    expect(coarse).not.toContain('Strong blend');
    const all00 = render({ ...DEFAULT_FORM, blend: { type00: 100, fineSemolina: 0, coarseSemolina: 0, breadFlour: 0 } });
    expect(all00).toContain('13.5 % protein · W 340 · P/L 1 · ash 0.45–0.50 %');
    expect(all00).toContain('Strong blend');
  });

  it('shows the pressing tips with sources', () => {
    expect(render()).toContain('cold dies give irregular pasta (Reber torchio manual)');
  });

  it('batch log renders delta text', () => {
    const out = html(
      <BatchLog batches={[mk('a', '2026-10-01T10:00:00Z', 0, 2), mk('b', '2026-10-10T10:00:00Z', 8, 4)]} unit="g" activeBatchId="b" onChange={noop} />,
    );
    expect(out).toContain('You added 8 g extra water');
    expect(out).toContain('4/5 vs 2/5');
  });
});
