import { useMemo, useState } from 'react';
import {
  FLOUR_KEYS,
  blendStats,
  calculate,
  calibrationFor,
  doughMassG,
  isStrongBlend,
  pressLoads,
  scaleForLoads,
  sheetFor,
  eggFromShelledG,
  eggToShelledG,
  flourName,
  formatAmount,
  round,
} from '../calc/calc';
import { n, pct, t, tp, tx } from '../i18n';
import { EGG_SIZES, IN_SHELL_YIELD, type EggSize } from '../calc/constants';
import type { Batch, EggError, EggKind, FlourKey, Mode, SqueezeState, Unit } from '../calc/types';
import {
  BIGOLARO_MODELS,
  ELECTRIC_MODELS,
  bigolaroDies,
  dieLabel,
  electricDies,
  type BigolaroModel,
  type Die,
  type ElectricModel,
} from '../data/bottene';
import { flourById, floursFor } from '../data/flours';
import { ALKALI_HANDLING_NOTE, CARE_NOTE, DIES, LYE_NOTE, MACHINES, MODE_OPTIONS, PRESS_TIPS } from '../data/profiles';
import { ROLL_SHAPES, ROLL_TIPS, type RollShape } from '../data/rolled';
import { SHEET_REF_CM } from '../calc/constants';
import type { FormState } from '../storage';
import { BlendEditor } from './BlendEditor';
import { Uncalibrated, UncalibratedList, Unvalidated } from './Bits';
import { AmbientField } from './AmbientField';
import { NumField } from './NumField';
import { RavioliGuide } from './RavioliGuide';
import { SqueezeTest } from './SqueezeTest';

interface Props {
  form: FormState;
  setForm: (f: FormState) => void;
  unit: Unit;
  batches: Batch[];
  activeBatch: Batch | undefined;
  onStart: (b: Batch) => void;
  onLogAdjust: (p: { waterG?: number; semolinaG?: number }) => void;
  onOpenLog: () => void;
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Calculator({ form, setForm, unit, batches, activeBatch, onStart, onLogAdjust, onOpenLog }: Props) {
  const [squeeze, setSqueeze] = useState<SqueezeState | null>(null);
  const [started, setStarted] = useState(false);
  const patch = (p: Partial<FormState>) => {
    setStarted(false);
    setForm({ ...form, ...p });
  };

  const egg = { kind: form.eggKind, value: form.eggValue, size: form.eggSize };
  const shelledG = eggToShelledG(egg);
  // A personal target needs enough well-rated batches in the same mode.
  const cal = useMemo(
    () =>
      form.mode === 'extruded' || form.mode === 'alkaline' || form.mode === 'rolled'
        ? calibrationFor(batches, {
            mode: form.mode,
            machine: form.machine,
            hasEgg: shelledG + form.yolkG > 0,
            blend: form.blend,
          })
        : null,
    [batches, form.mode, form.machine, shelledG, form.yolkG, form.blend],
  );
  const r = useMemo(
    () =>
      calculate({
        mode: form.mode,
        egg: { kind: form.eggKind, value: form.eggValue, size: form.eggSize },
        yolkG: form.yolkG,
        addedWaterG: form.addedWaterG,
        lyeWaterG: form.lyeWaterG,
        blend: form.blend,
        machine: form.machine,
        ambientC: form.ambientC,
        calibration: form.useCalibration ? cal : null,
      }),
    [form, cal],
  );
  const alkaline = form.mode === 'alkaline';
  const rolled = form.mode === 'rolled';
  const shape = ROLL_SHAPES[form.rollShape];

  // Rolled dough uses a pin or pasta roller; pressed dough a press or extruder.
  const withMode = (mode: Mode): Partial<FormState> => {
    if (mode === 'rolled') return { mode, machine: form.machine === 'roller' ? 'roller' : 'pin' };
    return { mode, machine: form.machine === 'pin' ? 'manual' : form.machine };
  };

  const dieOptions: Die[] =
    form.machine === 'manual'
      ? bigolaroDies(form.pressModel)
      : form.machine === 'electric'
        ? electricDies(form.electricModel)
        : DIES.map((d) => ({ id: d, name: d, dims: '' }));
  const selectedDie = form.dieCustom ? undefined : dieOptions.find((d) => d.id === form.dieId);
  const dieValue = form.dieCustom ? '__custom' : (selectedDie?.id ?? '');

  /** Short die name stored on batches, e.g. "N°10 Bigoli Ø3.0 mm". */
  const dieName = (d: Die) => `${d.code ? `N°${d.code} ` : ''}${d.name}${d.dims ? ` ${d.dims}` : ''}`;

  // Changing machine or model swaps the die list; keep the die if it still
  // exists, otherwise fall back to the first die supplied with the machine.
  const withDieFor = (next: Partial<FormState>): Partial<FormState> => {
    const f = { ...form, ...next };
    if (f.dieCustom) return next;
    const list =
      f.machine === 'manual' ? bigolaroDies(f.pressModel) : f.machine === 'electric' ? electricDies(f.electricModel) : [];
    if (list.some((d) => d.id === f.dieId)) return next;
    const d = list.find((x) => x.included) ?? list[0];
    return d ? { ...next, dieId: d.id, die: dieName(d) } : { ...next, dieId: '', die: '' };
  };

  const specs = Object.fromEntries(FLOUR_KEYS.map((k) => [k, flourById(form.flours[k])])) as Record<
    FlourKey,
    ReturnType<typeof flourById>
  >;
  const stats = blendStats(form.blend, specs);

  const press = form.machine === 'manual' && form.pressModel ? BIGOLARO_MODELS[form.pressModel] : null;
  const dough = doughMassG(r);
  const loads = press ? pressLoads(dough, press.capacityG) : null;

  // Scale every input so the dough fills exactly n loads. Counted eggs become
  // weighed grams, since a fraction of an egg can't be counted.
  const fillLoads = (n: number) => {
    if (!press) return;
    const k = scaleForLoads(dough, press.capacityG, n);
    patch({
      ...(form.eggKind === 'count'
        ? { eggKind: 'shelled' as const, eggValue: round(shelledG * k) }
        : { eggValue: round(form.eggValue * k, 1) }),
      yolkG: round(form.yolkG * k, 1),
      addedWaterG: round(form.addedWaterG * k, 1),
      lyeWaterG: round(form.lyeWaterG * k, 1),
    });
  };

  const changeEggKind = (kind: EggKind) => {
    const next = eggFromShelledG(shelledG, kind, form.eggSize);
    patch({ eggKind: kind, eggValue: next.value });
  };

  // Switch to weighed shelled eggs, prefilled with the current estimate, and
  // put the cursor in the field so the user just types what the scale says.
  const weighInstead = () => {
    patch({ eggKind: 'shelled', eggValue: round(shelledG) });
    requestAnimationFrame(() => {
      const el = document.getElementById('egg-value') as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
  };

  const changeEggSize = (size: EggSize) => {
    // Keep the count; the shelled weight follows the size.
    patch({ eggSize: size });
  };

  const start = () => {
    const batch: Batch = {
      id: newId(),
      createdAt: new Date().toISOString(),
      mode: form.mode,
      machine: form.machine,
      die: rolled ? `${tx(shape.short)} ${n(shape.thicknessMm)} mm` : form.die,
      blend: form.blend,
      eggShelledG: r.eggShelledG,
      yolkG: r.yolkG,
      addedWaterG: r.addedWaterG,
      lyeWaterG: r.lyeWaterG,
      ambientC: form.ambientC,
      flourTotalG: r.flourTotalG,
      hydration: r.hydration,
      restMinMin: r.rest.minMin,
      restMaxMin: r.rest.maxMin,
      extraWaterG: 0,
      extraSemolinaG: 0,
      rating: null,
      notes: '',
      flours: Object.fromEntries(FLOUR_KEYS.filter((k) => form.blend[k] > 0).map((k) => [k, form.flours[k]])),
      pressModel: form.machine === 'manual' ? form.pressModel : null,
    };
    onStart(batch);
    setStarted(true);
    setSqueeze(null);
  };

  return (
    <div className="stack">
      {/* ---- Mode ---- */}
      <fieldset className="card">
        <legend>{t('mode.legend')}</legend>
        <div className="radio-list">
          {MODE_OPTIONS.map((m) => (
            <label key={m.id} className={`radio${m.disabled ? ' disabled' : ''}${form.mode === m.id ? ' checked' : ''}`}>
              <input
                type="radio"
                name="mode"
                checked={form.mode === m.id}
                disabled={m.disabled}
                onChange={() => patch(withDieFor(withMode(m.id as Mode)))}
              />
              {tx(m.label)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---- Liquid ---- */}
      <fieldset className="card">
        <legend>{t('calc.liquid')}</legend>
        <div className="field">
          <label htmlFor="egg-kind">{t('egg.kind')}</label>
          <select id="egg-kind" value={form.eggKind} onChange={(e) => changeEggKind(e.target.value as EggKind)}>
            <option value="shelled">{t('egg.kind.shelled')}</option>
            <option value="count">{t('egg.kind.count')}</option>
            <option value="inShell">{t('egg.kind.inShell')}</option>
          </select>
        </div>
        <NumField
          id="egg-value"
          label={
            form.eggKind === 'count'
              ? t('egg.label.count')
              : form.eggKind === 'inShell'
                ? t('egg.label.inShell', { unit })
                : t('egg.label.shelled', { unit })
          }
          value={form.eggValue}
          unit={form.eggKind === 'count' ? undefined : unit}
          onChange={(v) => patch({ eggValue: v ?? 0 })}
          suffix={form.eggKind === 'count' ? t('egg.suffix.count') : unit}
        />
        {form.eggKind === 'count' && (
          <div className="field">
            <label htmlFor="egg-size">{t('egg.size')}</label>
            <select id="egg-size" value={form.eggSize} onChange={(e) => changeEggSize(e.target.value as EggSize)}>
              {Object.entries(EGG_SIZES).map(([id, sz]) => (
                <option key={id} value={id}>
                  {t('egg.sizeOption', { label: tx(sz.label), g: sz.shelledG })}
                </option>
              ))}
            </select>
          </div>
        )}
        {form.eggKind !== 'shelled' && shelledG > 0 && (
          <div className="converted">
            <p>
              {form.eggKind === 'inShell'
                ? t('egg.conv.inShell', {
                    a: formatAmount(form.eggValue, unit),
                    b: formatAmount(shelledG, unit),
                    y: n(Number(IN_SHELL_YIELD.toFixed(2))),
                  })
                : tp('egg.conv.count', form.eggValue, {
                    b: formatAmount(shelledG, unit),
                    g: EGG_SIZES[form.eggSize].shelledG,
                    label: tx(EGG_SIZES[form.eggSize].label),
                  })}
            </p>
            <button type="button" className="btn btn-small" onClick={weighInstead}>
              {t('egg.weighInstead')}
            </button>
          </div>
        )}
        <NumField
          label={t('calc.yolks', { unit })}
          value={form.yolkG}
          unit={unit}
          suffix={unit}
          onChange={(v) => patch({ yolkG: v ?? 0 })}
          hint={t('calc.yolks.hint')}
        />
        <NumField
          label={t('calc.water', { unit })}
          value={form.addedWaterG}
          unit={unit}
          suffix={unit}
          onChange={(v) => patch({ addedWaterG: v ?? 0 })}
          hint={
            alkaline
              ? cal && form.useCalibration
                ? t('calc.water.hint.cal')
                : t('calc.water.hint.low')
              : undefined
          }
        />
        {alkaline && (
          <>
            <NumField
              label={t('calc.lye', { unit })}
              value={form.lyeWaterG}
              unit={unit}
              suffix={unit}
              onChange={(v) => patch({ lyeWaterG: v ?? 0 })}
            />
            <div className="note note-danger">
              <strong>{t('calc.lye.title')}</strong>
              <p>{tx(LYE_NOTE)}</p>
              <p>
                {t('calc.lye.replaces').split('{badge}')[0]}
                <Unvalidated />
                {t('calc.lye.replaces').split('{badge}')[1]}
              </p>
            </div>
            <div className="note note-warn">
              <strong>{t('calc.soda.title')}</strong>
              <p>{tx(ALKALI_HANDLING_NOTE)}</p>
            </div>
          </>
        )}
      </fieldset>

      <BlendEditor blend={form.blend} onChange={(blend) => patch({ blend })} />

      {/* ---- Which flours ---- */}
      <fieldset className="card">
        <legend>{t('flour.yours')}</legend>
        {FLOUR_KEYS.filter((k) => form.blend[k] > 0).map((k) => {
          const f = specs[k];
          const facts = [
            f?.protein != null ? t('flour.protein', { v: f.protein }) : '',
            f?.w != null ? `W ${f.w}` : '',
            f?.pl != null ? `P/L ${n(f.pl)}` : '',
            f?.ash ? t('flour.ash', { v: f.ash }) : '',
          ].filter(Boolean);
          return (
            <div className="field" key={k}>
              <label htmlFor={`flour-${k}`}>
                {flourName(k)} ({pct(form.blend[k])})
              </label>
              <select
                id={`flour-${k}`}
                value={form.flours[k]}
                onChange={(e) => patch({ flours: { ...form.flours, [k]: e.target.value } })}
              >
                {floursFor(k).map((o) => (
                  <option key={o.id} value={o.id}>
                    {tx(o.label)}
                  </option>
                ))}
              </select>
              {(facts.length > 0 || f?.note) && (
                <p className="hint">
                  {facts.join(' · ')}
                  {facts.length > 0 && f?.note ? ' — ' : ''}
                  {f?.note && tx(f.note)}
                </p>
              )}
            </div>
          );
        })}
        {stats.protein != null && (
          <p className="hint">
            {t('flour.blendProtein', { v: round(stats.protein, 1) })}
            {stats.proteinCoverage < 0.999 && t('flour.blendCoverage', { v: round(stats.proteinCoverage * 100) })}
            {stats.w != null && t('flour.blendW', { w: round(stats.w), c: round(stats.wCoverage * 100) })}.
          </p>
        )}
        {isStrongBlend(stats.protein) && (
          <div className="note">{t('flour.strong')}</div>
        )}
      </fieldset>

      {/* ---- Rolling (rolled mode) ---- */}
      {rolled && (
        <fieldset className="card">
          <legend>{t('calc.rolling')}</legend>
          <div className="field">
            <label htmlFor="roll-tool">{t('calc.rollTool')}</label>
            <select
              id="roll-tool"
              value={form.machine}
              onChange={(e) => patch({ machine: e.target.value as FormState['machine'] })}
            >
              {(['pin', 'roller'] as const).map((id) => (
                <option key={id} value={id}>
                  {tx(MACHINES[id].label)}
                </option>
              ))}
            </select>
            <p className="hint">{tx(MACHINES[form.machine].note)}</p>
          </div>
          <div className="field">
            <label htmlFor="roll-shape">{t('calc.shape')}</label>
            <select
              id="roll-shape"
              value={form.rollShape}
              onChange={(e) => patch({ rollShape: e.target.value as RollShape })}
            >
              {Object.entries(ROLL_SHAPES).map(([id, s]) => (
                <option key={id} value={id}>
                  {tx(s.label)}
                </option>
              ))}
            </select>
            <p className="hint">
              {t('shape.thickness', { t: shape.thicknessMm, lo: shape.rangeMm[0], hi: shape.rangeMm[1] })} {tx(shape.note)}
            </p>
            {shape.cuts && <p className="hint">{t('shape.cuts', { list: shape.cuts.join(' · ') })}</p>}
          </div>
          <AmbientField form={form} patch={patch} />
        </fieldset>
      )}

      {rolled && form.rollShape === 'ravioli' && r.status === 'ok' && (
        <RavioliGuide form={form} patch={patch} doughG={dough} thicknessMm={shape.thicknessMm} unit={unit} />
      )}

      {/* ---- Machine ---- */}
      {!rolled && (
      <fieldset className="card">
        <legend>{t('calc.machine')}</legend>
        <div className="field">
          <label htmlFor="machine">{t('calc.machine')}</label>
          <select
            id="machine"
            value={form.machine}
            onChange={(e) => patch(withDieFor({ machine: e.target.value as FormState['machine'] }))}
          >
            {Object.entries(MACHINES)
              .filter(([id]) => id !== 'pin')
              .map(([id, m]) => (
                <option key={id} value={id}>
                  {tx(m.label)}
                </option>
              ))}
          </select>
          <p className="hint">{tx(MACHINES[form.machine].note)}</p>
        </div>
        {form.machine === 'manual' && (
          <div className="field">
            <label htmlFor="press-model">{t('calc.pressModel')}</label>
            <select
              id="press-model"
              value={form.pressModel ?? ''}
              onChange={(e) => patch(withDieFor({ pressModel: (e.target.value || null) as BigolaroModel | null }))}
            >
              <option value="">{t('calc.notSet')}</option>
              {Object.entries(BIGOLARO_MODELS).map(([id, m]) => (
                <option key={id} value={id}>
                  {t('calc.modelOption', { label: m.label, g: m.capacityG })}
                </option>
              ))}
            </select>
          </div>
        )}
        {form.machine === 'electric' && (
          <div className="field">
            <label htmlFor="electric-model">{t('calc.electricModel')}</label>
            <select
              id="electric-model"
              value={form.electricModel ?? ''}
              onChange={(e) => patch(withDieFor({ electricModel: (e.target.value || null) as ElectricModel | null }))}
            >
              <option value="">{t('calc.anyModel')}</option>
              {Object.entries(ELECTRIC_MODELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="die">{t('calc.die')}</label>
          <select
            id="die"
            value={dieValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__custom') return patch({ dieCustom: true, dieId: '', die: '' });
              const d = dieOptions.find((x) => x.id === v);
              if (d) patch({ dieCustom: false, dieId: d.id, die: dieName(d) });
            }}
          >
            {dieValue === '' && <option value="">{t('calc.chooseDie')}</option>}
            {dieOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {dieLabel(d)}
              </option>
            ))}
            <option value="__custom">{t('calc.customDie')}</option>
          </select>
          {selectedDie?.sizeNote && <p className="hint">{tx(selectedDie.sizeNote)}.</p>}
          {form.machine === 'manual' && selectedDie?.force === 'high' && (
            <p className="hint">{t('die.thin')}</p>
          )}
          {form.machine === 'manual' && selectedDie?.force === 'low' && (
            <p className="hint">{t('die.large')}</p>
          )}
          {selectedDie?.ptfe && <p className="hint">{t('die.ptfe')}</p>}
          {form.dieCustom && (
            <input
              aria-label={t('calc.customDieName')}
              type="text"
              value={form.die}
              placeholder={t('calc.dieExample')}
              onChange={(e) => patch({ die: e.target.value })}
            />
          )}
        </div>
        <AmbientField form={form} patch={patch} />
      </fieldset>
      )}

      {rolled && (
        <div className="note">
          <strong>{t('roll.tipsTitle')}</strong>
          <ul>
            {ROLL_TIPS.map((tip) => (
              <li key={tip.k}>{tx(tip)}</li>
            ))}
          </ul>
        </div>
      )}

      {!rolled && form.machine !== 'roller' && (
        <div className="note">
          <strong>{t('press.tipsTitle')}</strong>
          <ul>
            {PRESS_TIPS.map((tip) => (
              <li key={tip.k}>{tx(tip)}</li>
            ))}
          </ul>
        </div>
      )}

      {(form.mode === 'extruded' || (alkaline && form.machine !== 'roller')) && (
        <div className="note note-care">
          <strong>{t('care.title')}</strong>
          <p>{tx(CARE_NOTE)}</p>
        </div>
      )}

      {cal && (
        <label className={`radio${form.useCalibration ? ' checked' : ''}`}>
          <input
            type="checkbox"
            checked={form.useCalibration}
            onChange={(e) => patch({ useCalibration: e.target.checked })}
          />
          <span>
            {t('cal.use', { v: pct(round(cal.target * 100, 1)) })}
            <span className="hint" style={{ display: 'block', fontWeight: 400 }}>
              {t(alkaline ? 'cal.detail.alkaline' : rolled ? 'cal.detail.rolled' : 'cal.detail.extruded', { n: cal.n })}
            </span>
          </span>
        </label>
      )}

      {/* ---- Results ---- */}
      <section className="card results" aria-live="polite">
        <h2>{t('res.title')}</h2>
        {r.status !== 'ok' ? (
          <p className="muted">{r.message && tx(r.message)}</p>
        ) : (
          <>
            {r.warnings.map((w) => (
              <div key={w.id} className={`note ${w.level === 'warn' ? 'note-danger' : ''}`} role="alert">
                {tx(w.text)}
              </div>
            ))}

            <div className="big">
              <span className="big-num">{formatAmount(r.flourTotalG, unit)}</span>
              <span className="big-label">{t('res.totalFlour')}</span>
              {!alkaline && (
                <span className="range">
                  {t('res.range', { a: formatAmount(r.flourRangeG[0], unit), b: formatAmount(r.flourRangeG[1], unit) })}
                </span>
              )}
            </div>
            {r.eggError && <EggPrecision err={r.eggError} unit={unit} onWeigh={weighInstead} />}

            {rolled && <SheetInfo doughG={dough} thicknessMm={shape.thicknessMm} unit={unit} shapeLabel={tx(shape.shortLc)} />}

            {press && loads && (
              <div className="precision precision-loads">
                <p>
                  {tp('res.loads', loads.loads, {
                    dough: formatAmount(dough, unit),
                    loads: round(loads.loads, 2),
                    press: press.label,
                    cap: formatAmount(press.capacityG, unit),
                  })}
                  {loads.fullLoads > 1 &&
                    Math.abs(loads.loads - Math.round(loads.loads)) > 0.05 &&
                    ` ${t('res.lastPartly')}`}
                </p>
                <div className="row">
                  {[...new Set([Math.max(1, Math.floor(loads.loads)), Math.max(1, Math.ceil(loads.loads))])].map(
                    (k) => (
                      <button key={k} type="button" className="btn btn-small" onClick={() => fillLoads(k)}>
                        {tp('res.scaleTo', k)}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            <dl className="kv">
              {FLOUR_KEYS.filter((k) => form.blend[k] > 0).map((k) => (
                <div key={k}>
                  <dt>
                    {specs[k]?.product ? tx(specs[k]!.label) : flourName(k)} ({pct(form.blend[k])})
                  </dt>
                  <dd>{formatAmount(r.flourBreakdownG[k], unit)}</dd>
                </div>
              ))}
              <div>
                <dt>{t('res.totalLiquid')}</dt>
                <dd>{formatAmount(r.totalLiquidG, unit)}</dd>
              </div>
              <div>
                <dt>
                  {t('res.hydration')}
                  {r.calibration && (
                    <>
                      {' '}
                      <span className="badge badge-ok">{t('res.yourTarget')}</span>
                    </>
                  )}
                  {r.uncalibrated.includes('WATER_ONLY_HYDRATION') && <> <Uncalibrated id="WATER_ONLY_HYDRATION" /></>}
                  {r.uncalibrated.includes('ROLLED_HYDRATION') && <> <Uncalibrated id="ROLLED_HYDRATION" /></>}
                </dt>
                <dd>
                  {pct(round(r.hydration * 100, 1))}
                  {!alkaline && (
                    <span className="range">
                      {' '}
                      ({n(round(r.hydrationRange[0] * 100, 1))}–{pct(round(r.hydrationRange[1] * 100, 1))})
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <h3>{t('res.texture')}</h3>
            <p className="texture">{r.textureTarget && tx(r.textureTarget)}</p>

            <p className="hint">{t('res.hydrationNote')}</p>

            <h3>
              {t('res.rest')}
              {r.uncalibrated.includes('ROLLED_REST') && <> <Uncalibrated id="ROLLED_REST" /></>}
            </h3>
            <p className="rest">
              <strong>{t('res.restTime', { a: r.rest.minMin, b: r.rest.maxMin })}</strong>{' '}
              {t('res.restLine', { v: round(r.rest.coarseShare * 100) })}
            </p>
            <ul className="plain">
              {r.rest.notes.map((note) => (
                <li key={note.k}>{tx(note)}</li>
              ))}
            </ul>

            {alkaline && (
              <>
                <h3>{t('res.bakers')}</h3>
                <table className="bakers">
                  <thead>
                    <tr>
                      <th>{t('res.th.ingredient')}</th>
                      <th>{t('res.th.amount')}</th>
                      <th>{t('res.th.pct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ingredients.map((i) => (
                      <tr key={i.label.k}>
                        <td className={i.indent ? 'indent' : undefined}>
                          {tx(i.label)}
                          {i.note && <small className="cell-note">{tx(i.note)}</small>}
                        </td>
                        <td>{formatAmount(i.grams, unit)}</td>
                        <td>{n(round(i.pct, 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {r.suggestedAddedWaterG && !r.calibration && (
                  <p className="hint">
                    {t('res.waterRange', {
                      a: formatAmount(r.suggestedAddedWaterG[0], unit),
                      b: formatAmount(r.suggestedAddedWaterG[1], unit),
                    })}
                  </p>
                )}
              </>
            )}

            <UncalibratedList ids={r.uncalibrated} />
          </>
        )}
      </section>

      {/* ---- Adjust / squeeze test ---- */}
      <details className="card adjust">
        <summary>{rolled ? t('adj.knead') : t('adj.squeeze')}</summary>
        <SqueezeTest
          state={squeeze}
          onState={setSqueeze}
          unit={unit}
          mode={form.mode}
          flourG={r.status === 'ok' ? r.flourTotalG : 500}
          activeBatch={activeBatch}
          onLogAdjust={onLogAdjust}
        />
      </details>

      {/* ---- Start batch ---- */}
      <div className="start">
        <button type="button" className="btn btn-primary" disabled={r.status !== 'ok'} onClick={start}>
          {t('start.button')}
        </button>
        {started && (
          <p className="ok" role="status">
            {t('start.done')}{' '}
            <button type="button" className="link" onClick={onOpenLog}>
              {t('start.open')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/** How big the rolled dough gets at the target thickness. */
function SheetInfo({
  doughG,
  thicknessMm,
  unit,
  shapeLabel,
}: {
  doughG: number;
  thicknessMm: number;
  unit: Unit;
  shapeLabel: string;
}) {
  const s = sheetFor(doughG, thicknessMm);
  if (s.areaCm2 <= 0) return null;
  return (
    <div className="precision precision-loads">
      <p>
        <strong>
          {t('sheet.head', { dough: formatAmount(doughG, unit), sheets: round(s.sheets, 1), ref: SHEET_REF_CM })}
        </strong>{' '}
        {t('sheet.tail', { t: thicknessMm, shape: shapeLabel, dm: round(s.areaCm2 / 100) })}{' '}
        <Uncalibrated id="DOUGH_DENSITY" />
      </p>
    </div>
  );
}

/** How much the flour figure depends on how the egg was measured. */
function EggPrecision({ err, unit, onWeigh }: { err: EggError; unit: Unit; onWeigh: () => void }) {
  const eggPct = (f: number) => pct(f < 0.01 ? round(f * 100, 1) : round(f * 100));
  if (err.kind === 'shelled') {
    return (
      <p className="precision precision-ok">
        <strong>{t('prec.okHead')}</strong>{' '}
        {t('prec.okBody', { a: formatAmount(err.flourG, unit), p: eggPct(err.fraction) })}
      </p>
    );
  }
  return (
    <div className="precision precision-warn">
      <p>
        <strong>
          {t(err.kind === 'count' ? 'prec.warnHead.count' : 'prec.warnHead.inShell', {
            a: formatAmount(err.flourG, unit),
          })}
        </strong>{' '}
        {t('prec.warnBody', { p: eggPct(err.fraction) })}
        {err.kind === 'count' && ` ${t('prec.warnSize')}`} {t('prec.warnCut', { a: formatAmount(err.weighedFlourG, unit) })}
      </p>
      <button type="button" className="btn btn-small" onClick={onWeigh}>
        {t('prec.weigh')}
      </button>
    </div>
  );
}
