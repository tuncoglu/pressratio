import { useMemo, useState } from 'react';
import {
  FLOUR_KEYS,
  FLOUR_LABELS,
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
  formatAmount,
  round,
} from '../calc/calc';
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
      die: rolled ? `${shape.short} ${shape.thicknessMm} mm` : form.die,
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
        <legend>Mode</legend>
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
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---- Liquid ---- */}
      <fieldset className="card">
        <legend>Liquid</legend>
        <div className="field">
          <label htmlFor="egg-kind">Egg entered as</label>
          <select id="egg-kind" value={form.eggKind} onChange={(e) => changeEggKind(e.target.value as EggKind)}>
            <option value="shelled">Shelled weight (g)</option>
            <option value="count">Number of eggs</option>
            <option value="inShell">In-shell weight (g)</option>
          </select>
        </div>
        <NumField
          id="egg-value"
          label={form.eggKind === 'count' ? 'Eggs' : form.eggKind === 'inShell' ? `Egg, in shell (${unit})` : `Egg, shelled (${unit})`}
          value={form.eggValue}
          unit={form.eggKind === 'count' ? undefined : unit}
          onChange={(v) => patch({ eggValue: v ?? 0 })}
          suffix={form.eggKind === 'count' ? 'eggs' : unit}
        />
        {form.eggKind === 'count' && (
          <div className="field">
            <label htmlFor="egg-size">Egg size</label>
            <select id="egg-size" value={form.eggSize} onChange={(e) => changeEggSize(e.target.value as EggSize)}>
              {Object.entries(EGG_SIZES).map(([id, sz]) => (
                <option key={id} value={id}>
                  {sz.label} ≈ {sz.shelledG} g shelled
                </option>
              ))}
            </select>
          </div>
        )}
        {form.eggKind !== 'shelled' && shelledG > 0 && (
          <div className="converted">
            <p>
              {form.eggKind === 'inShell'
                ? `${formatAmount(form.eggValue, unit)} in shell → ${formatAmount(shelledG, unit)} shelled (× ${IN_SHELL_YIELD.toFixed(2)})`
                : `${form.eggValue} egg${form.eggValue === 1 ? '' : 's'} → ${formatAmount(shelledG, unit)} shelled (assumes ${EGG_SIZES[form.eggSize].shelledG} g per ${EGG_SIZES[form.eggSize].label} egg)`}
            </p>
            <button type="button" className="btn btn-small" onClick={weighInstead}>
              I weighed them (shelled)
            </button>
          </div>
        )}
        <NumField
          label={`Extra yolks (${unit}) — optional`}
          value={form.yolkG}
          unit={unit}
          suffix={unit}
          onChange={(v) => patch({ yolkG: v ?? 0 })}
          hint="Yolks are ~52 % water vs ~75 % for whole egg, so they count for less."
        />
        <NumField
          label={`Added water (${unit}) — optional`}
          value={form.addedWaterG}
          unit={unit}
          suffix={unit}
          onChange={(v) => patch({ addedWaterG: v ?? 0 })}
          hint={
            alkaline
              ? cal && form.useCalibration
                ? 'Leave empty to use your calibrated target.'
                : 'Leave empty to start at the low end (10 % of flour).'
              : undefined
          }
        />
        {alkaline && (
          <>
            <NumField
              label={`Lye water (kansui) (${unit}) — optional`}
              value={form.lyeWaterG}
              unit={unit}
              suffix={unit}
              onChange={(v) => patch({ lyeWaterG: v ?? 0 })}
            />
            <div className="note note-danger">
              <strong>Lye water safety</strong>
              <p>{LYE_NOTE}</p>
              <p>
                Entering lye water replaces the baked baking soda. The conversion is <Unvalidated />.
              </p>
            </div>
            <div className="note note-warn">
              <strong>Baked soda &amp; alkaline dough</strong>
              <p>{ALKALI_HANDLING_NOTE}</p>
            </div>
          </>
        )}
      </fieldset>

      <BlendEditor blend={form.blend} onChange={(blend) => patch({ blend })} />

      {/* ---- Which flours ---- */}
      <fieldset className="card">
        <legend>Your flours</legend>
        {FLOUR_KEYS.filter((k) => form.blend[k] > 0).map((k) => {
          const f = specs[k];
          const facts = [
            f?.protein != null ? `${f.protein} % protein` : '',
            f?.w != null ? `W ${f.w}` : '',
            f?.pl != null ? `P/L ${f.pl}` : '',
            f?.ash ? `ash ${f.ash}` : '',
          ].filter(Boolean);
          return (
            <div className="field" key={k}>
              <label htmlFor={`flour-${k}`}>
                {FLOUR_LABELS[k]} ({form.blend[k]} %)
              </label>
              <select
                id={`flour-${k}`}
                value={form.flours[k]}
                onChange={(e) => patch({ flours: { ...form.flours, [k]: e.target.value } })}
              >
                {floursFor(k).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {(facts.length > 0 || f?.note) && (
                <p className="hint">
                  {facts.join(' · ')}
                  {facts.length > 0 && f?.note ? ' — ' : ''}
                  {f?.note}
                </p>
              )}
            </div>
          );
        })}
        {stats.protein != null && (
          <p className="hint">
            Blend: {round(stats.protein, 1)} % protein
            {stats.proteinCoverage < 0.999 && ` (${round(stats.proteinCoverage * 100)} % of the blend has data)`}
            {stats.w != null && `, W ≈ ${round(stats.w)} (${round(stats.wCoverage * 100)} % of the blend)`}.
          </p>
        )}
        {isStrongBlend(stats.protein) && (
          <div className="note">
            Strong blend. High-protein flours absorb more water and form a tougher, more elastic dough, so expect to land
            nearer the wet end of the band and to need more force on a manual press. Your calibrated target will capture
            this once you've rated a few batches.
          </div>
        )}
      </fieldset>

      {/* ---- Rolling (rolled mode) ---- */}
      {rolled && (
        <fieldset className="card">
          <legend>Rolling</legend>
          <div className="field">
            <label htmlFor="roll-tool">Rolling with</label>
            <select
              id="roll-tool"
              value={form.machine}
              onChange={(e) => patch({ machine: e.target.value as FormState['machine'] })}
            >
              {(['pin', 'roller'] as const).map((id) => (
                <option key={id} value={id}>
                  {MACHINES[id].label}
                </option>
              ))}
            </select>
            <p className="hint">{MACHINES[form.machine].note}</p>
          </div>
          <div className="field">
            <label htmlFor="roll-shape">Shape</label>
            <select
              id="roll-shape"
              value={form.rollShape}
              onChange={(e) => patch({ rollShape: e.target.value as RollShape })}
            >
              {Object.entries(ROLL_SHAPES).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="hint">
              Roll to about {shape.thicknessMm} mm (range {shape.rangeMm[0]}–{shape.rangeMm[1]} mm). {shape.note}
            </p>
            {shape.cuts && <p className="hint">Cut widths: {shape.cuts.join(' · ')}.</p>}
          </div>
          <NumField
            label="Ambient temperature (°C) — optional"
            value={form.ambientC}
            nullable
            suffix="°C"
            placeholder="20"
            onChange={(v) => patch({ ambientC: v })}
          />
        </fieldset>
      )}

      {rolled && form.rollShape === 'ravioli' && r.status === 'ok' && (
        <RavioliGuide form={form} patch={patch} doughG={dough} thicknessMm={shape.thicknessMm} unit={unit} />
      )}

      {/* ---- Machine ---- */}
      {!rolled && (
      <fieldset className="card">
        <legend>Machine</legend>
        <div className="field">
          <label htmlFor="machine">Machine</label>
          <select
            id="machine"
            value={form.machine}
            onChange={(e) => patch(withDieFor({ machine: e.target.value as FormState['machine'] }))}
          >
            {Object.entries(MACHINES)
              .filter(([id]) => id !== 'pin')
              .map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}
                </option>
              ))}
          </select>
          <p className="hint">{MACHINES[form.machine].note}</p>
        </div>
        {form.machine === 'manual' && (
          <div className="field">
            <label htmlFor="press-model">Bigolaro model</label>
            <select
              id="press-model"
              value={form.pressModel ?? ''}
              onChange={(e) => patch(withDieFor({ pressModel: (e.target.value || null) as BigolaroModel | null }))}
            >
              <option value="">Not set</option>
              {Object.entries(BIGOLARO_MODELS).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label}: {m.capacityG} g dough per load
                </option>
              ))}
            </select>
          </div>
        )}
        {form.machine === 'electric' && (
          <div className="field">
            <label htmlFor="electric-model">Model</label>
            <select
              id="electric-model"
              value={form.electricModel ?? ''}
              onChange={(e) => patch(withDieFor({ electricModel: (e.target.value || null) as ElectricModel | null }))}
            >
              <option value="">Any model (show all dies)</option>
              {Object.entries(ELECTRIC_MODELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="die">Die</label>
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
            {dieValue === '' && <option value="">Choose a die…</option>}
            {dieOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {dieLabel(d)}
              </option>
            ))}
            <option value="__custom">Custom…</option>
          </select>
          {selectedDie?.sizeNote && <p className="hint">{selectedDie.sizeNote}.</p>}
          {form.machine === 'manual' && selectedDie?.force === 'high' && (
            <p className="hint">
              Thin die: these need the most force on a Bigolaro. Drier dough sharply raises extrusion pressure, so aim
              for the wetter half of the band: crumbs that clump readily but still don't form a smooth ball.
            </p>
          )}
          {form.machine === 'manual' && selectedDie?.force === 'low' && (
            <p className="hint">Large shape: among the easiest to press.</p>
          )}
          {selectedDie?.ptfe && <p className="hint">PTFE die: smoother, glossier pasta than bronze.</p>}
          {form.dieCustom && (
            <input
              aria-label="Custom die name"
              type="text"
              value={form.die}
              placeholder="e.g. fusilli"
              onChange={(e) => patch({ die: e.target.value })}
            />
          )}
        </div>
        <NumField
          label="Ambient temperature (°C) — optional"
          value={form.ambientC}
          nullable
          suffix="°C"
          placeholder="20"
          onChange={(v) => patch({ ambientC: v })}
        />
      </fieldset>
      )}

      {rolled && (
        <div className="note">
          <strong>Before you roll</strong>
          <ul>
            {ROLL_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {!rolled && form.machine !== 'roller' && (
        <div className="note">
          <strong>Before you press</strong>
          <ul>
            {PRESS_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {(form.mode === 'extruded' || (alkaline && form.machine !== 'roller')) && (
        <div className="note note-care">
          <strong>Care note</strong>
          <p>{CARE_NOTE}</p>
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
            Use my calibrated target: {round(cal.target * 100, 1)} % hydration
            <span className="hint" style={{ display: 'block', fontWeight: 400 }}>
              Median of {cal.n} {alkaline ? 'alkaline ' : rolled ? 'rolled ' : ''}batches rated 4+ with this{' '}
              {rolled ? 'tool' : 'machine'}, liquid and a similar flour blend.{' '}
              {alkaline ? 'It sets the added water.' : rolled ? 'Default is 37.5 %.' : 'Default is 30 %.'}
            </span>
          </span>
        </label>
      )}

      {/* ---- Results ---- */}
      <section className="card results" aria-live="polite">
        <h2>Result</h2>
        {r.status !== 'ok' ? (
          <p className="muted">{r.message}</p>
        ) : (
          <>
            {r.warnings.map((w) => (
              <div key={w.id} className={`note ${w.level === 'warn' ? 'note-danger' : ''}`} role="alert">
                {w.text}
              </div>
            ))}

            <div className="big">
              <span className="big-num">{formatAmount(r.flourTotalG, unit)}</span>
              <span className="big-label">total flour</span>
              {!alkaline && (
                <span className="range">
                  range {formatAmount(r.flourRangeG[0], unit)} – {formatAmount(r.flourRangeG[1], unit)}
                </span>
              )}
            </div>
            {r.eggError && <EggPrecision err={r.eggError} unit={unit} onWeigh={weighInstead} />}

            {rolled && <SheetInfo doughG={dough} thicknessMm={shape.thicknessMm} unit={unit} shapeLabel={shape.short} />}

            {press && loads && (
              <div className="precision precision-loads">
                <p>
                  <strong>
                    {formatAmount(dough, unit)} dough = {round(loads.loads, 2)} load{loads.loads === 1 ? '' : 's'}
                  </strong>{' '}
                  of your {press.label} ({formatAmount(press.capacityG, unit)} per load).
                  {loads.fullLoads > 1 && Math.abs(loads.loads - Math.round(loads.loads)) > 0.05 &&
                    ' The last load will be partly full.'}
                </p>
                <div className="row">
                  {[...new Set([Math.max(1, Math.floor(loads.loads)), Math.max(1, Math.ceil(loads.loads))])].map(
                    (n) => (
                      <button key={n} type="button" className="btn btn-small" onClick={() => fillLoads(n)}>
                        Scale to {n} full load{n === 1 ? '' : 's'}
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
                    {specs[k]?.product ? specs[k]!.label : FLOUR_LABELS[k]} ({form.blend[k]} %)
                  </dt>
                  <dd>{formatAmount(r.flourBreakdownG[k], unit)}</dd>
                </div>
              ))}
              <div>
                <dt>Total liquid</dt>
                <dd>{formatAmount(r.totalLiquidG, unit)}</dd>
              </div>
              <div>
                <dt>
                  Hydration (water ÷ flour){r.calibration && <> <span className="badge badge-ok">your target</span></>}
                  {r.uncalibrated.includes('WATER_ONLY_HYDRATION') && <> <Uncalibrated id="WATER_ONLY_HYDRATION" /></>}
                  {r.uncalibrated.includes('ROLLED_HYDRATION') && <> <Uncalibrated id="ROLLED_HYDRATION" /></>}
                </dt>
                <dd>
                  {round(r.hydration * 100, 1)} %
                  {!alkaline && (
                    <span className="range">
                      {' '}
                      ({round(r.hydrationRange[0] * 100, 1)}–{round(r.hydrationRange[1] * 100, 1)} %)
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <h3>Texture target</h3>
            <p className="texture">{r.textureTarget}</p>

            <p className="hint">
              Water you add (egg water included) ÷ flour as weighed. The flour's own 10–15 % moisture isn't counted, and
              it varies with storage, so the squeeze test has the final say.
            </p>

            <h3>
              Rest{r.uncalibrated.includes('ROLLED_REST') && <> <Uncalibrated id="ROLLED_REST" /></>}
            </h3>
            <p className="rest">
              <strong>
                {r.rest.minMin}–{r.rest.maxMin} min
              </strong>{' '}
              covered, at room temperature ({round(r.rest.coarseShare * 100)} % coarse semolina)
            </p>
            <ul className="plain">
              {r.rest.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>

            {alkaline && (
              <>
                <h3>Baker's percentages</h3>
                <table className="bakers">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Amount</th>
                      <th>% flour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ingredients.map((i) => (
                      <tr key={i.label}>
                        <td className={i.label.startsWith('  ') ? 'indent' : undefined}>
                          {i.label.trim()}
                          {i.note && <small className="cell-note">{i.note}</small>}
                        </td>
                        <td>{formatAmount(i.grams, unit)}</td>
                        <td>{round(i.pct, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {r.suggestedAddedWaterG && !r.calibration && (
                  <p className="hint">
                    Added water range: {formatAmount(r.suggestedAddedWaterG[0], unit)}–
                    {formatAmount(r.suggestedAddedWaterG[1], unit)} (10–17 % of flour). Start low.
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
        <summary>{rolled ? 'Adjust — knead test' : 'Adjust — squeeze test'}</summary>
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
          Start batch
        </button>
        {started && (
          <p className="ok" role="status">
            Batch started and logged.{' '}
            <button type="button" className="link" onClick={onOpenLog}>
              Open batch log
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
          {formatAmount(doughG, unit)} dough → about {round(s.sheets, 1)} sheets of {SHEET_REF_CM} × {SHEET_REF_CM} cm
        </strong>{' '}
        at {thicknessMm} mm ({shapeLabel.toLowerCase()}), about {round(s.areaCm2 / 100)} dm² in all. Roll it in portions
        you can handle with your pin and keep the rest wrapped. <Uncalibrated id="DOUGH_DENSITY" />
      </p>
    </div>
  );
}

const EGG_SOURCE: Record<EggKind, string> = {
  count: 'counted eggs',
  inShell: 'in-shell weight',
  shelled: 'weighed shelled eggs',
};

/** How much the flour figure depends on how the egg was measured. */
function EggPrecision({ err, unit, onWeigh }: { err: EggError; unit: Unit; onWeigh: () => void }) {
  const pct = (f: number) => `${f < 0.01 ? round(f * 100, 1) : round(f * 100)} %`;
  if (err.kind === 'shelled') {
    return (
      <p className="precision precision-ok">
        <strong>Egg weighed ✓</strong> — egg error ±{formatAmount(err.flourG, unit)} of flour ({pct(err.fraction)}, a 1 g
        scale). The range above comes from the dough itself, not from your measuring.
      </p>
    );
  }
  return (
    <div className="precision precision-warn">
      <p>
        <strong>
          ±{formatAmount(err.flourG, unit)} of flour from {EGG_SOURCE[err.kind]}
        </strong>{' '}
        (egg weight ±{pct(err.fraction)}), on top of the range above.
        {err.kind === 'count' && ' Picking the wrong size class makes it worse.'} Weighing the shelled eggs cuts this to
        about ±{formatAmount(err.weighedFlourG, unit)}.
      </p>
      <button type="button" className="btn btn-small" onClick={onWeigh}>
        Weigh shelled eggs instead
      </button>
    </div>
  );
}
