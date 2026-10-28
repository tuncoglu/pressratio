import { useRef, useState } from 'react';
import { FLOUR_KEYS, FLOUR_LABELS, achievedHydration, deltaVsPrevious, describeDelta, formatAmount, round } from '../calc/calc';
import type { Batch, Unit } from '../calc/types';
import { BIGOLARO_MODELS, type BigolaroModel } from '../data/bottene';
import { flourById } from '../data/flours';
import { MACHINES, MODE_SHORT } from '../data/profiles';
import { exportJson, mergeBatches, parseImport } from '../storage';
import { BlendEditor } from './BlendEditor';
import { NumField } from './NumField';

interface Props {
  batches: Batch[];
  unit: Unit;
  activeBatchId: string | null;
  onChange: (batches: Batch[]) => void;
}

const sortBatches = (b: Batch[]) => [...b].sort((x, y) => y.createdAt.localeCompare(x.createdAt));

const blendSummary = (b: Batch) =>
  FLOUR_KEYS.filter((k) => b.blend[k] > 0)
    .map((k) => {
      const f = flourById(b.flours?.[k]);
      return `${b.blend[k]} % ${f?.product ? f.label : FLOUR_LABELS[k].toLowerCase()}`;
    })
    .join(' / ');

/** yyyy-mm-dd in local time, for <input type="date">. */
const localDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Move an ISO timestamp to another local calendar day, keeping the time of day. */
function withDate(iso: string, ymd: string): string {
  const old = new Date(iso);
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const next = new Date(old);
  next.setFullYear(y, m - 1, d);
  return Number.isNaN(next.getTime()) ? iso : next.toISOString();
}

export function BatchLog({ batches, unit, activeBatchId, onChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<Batch>) =>
    onChange(batches.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const doExport = () => {
    const blob = new Blob([exportJson({ unit, batches })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pressratio-batches-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ ok: true, text: `Exported ${batches.length} batch${batches.length === 1 ? '' : 'es'}.` });
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const res = parseImport(await file.text());
    if (!res.ok) {
      setMessage({ ok: false, text: res.error });
    } else {
      onChange(mergeBatches(batches, res.batches));
      setMessage({
        ok: true,
        text: `Imported ${res.batches.length} batch${res.batches.length === 1 ? '' : 'es'}${res.skipped ? ` (${res.skipped} skipped as unreadable)` : ''}. Same-id batches were overwritten.`,
      });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const sorted = sortBatches(batches);

  return (
    <div className="stack">
      <section className="card">
        <h2>Batch log</h2>
        <div className="row">
          <button type="button" className="btn" onClick={doExport} disabled={batches.length === 0}>
            Export JSON
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void doImport(e.target.files?.[0])}
          />
        </div>
        {message && (
          <p className={message.ok ? 'ok' : 'error'} role="status">
            {message.text}
          </p>
        )}
        <p className="hint">Everything stays on this device. Export to back it up or move it to another phone.</p>
        <p className="hint">
          Rate batches and log the water or semolina you add. Once two or more batches with the same machine are rated
          4+, the calculator offers their median hydration as your own target.
        </p>
      </section>

      {sorted.length === 0 && (
        <p className="muted center">No batches yet. Start one from the Calculator tab.</p>
      )}

      {sorted.map((b) => {
        const delta = deltaVsPrevious(b, batches);
        const isEditing = editing === b.id;
        return (
          <article key={b.id} className={`card batch${b.id === activeBatchId ? ' active' : ''}`}>
            <header className="batch-head">
              <div>
                <strong>{new Date(b.createdAt).toLocaleDateString()}</strong>{' '}
                <span className="tag">{MODE_SHORT[b.mode]}</span>
                {b.id === activeBatchId && <span className="tag tag-active">current</span>}
              </div>
              <div className="row">
                <button type="button" className="btn btn-small" onClick={() => setEditing(isEditing ? null : b.id)}>
                  {isEditing ? 'Done' : 'Edit'}
                </button>
                <button
                  type="button"
                  className={`btn btn-small${confirmDelete === b.id ? ' btn-danger' : ''}`}
                  onClick={() => {
                    if (confirmDelete === b.id) {
                      onChange(batches.filter((x) => x.id !== b.id));
                      setConfirmDelete(null);
                      setEditing(null);
                    } else setConfirmDelete(b.id);
                  }}
                  onBlur={() => setConfirmDelete(null)}
                >
                  {confirmDelete === b.id ? 'Tap to confirm' : 'Delete'}
                </button>
              </div>
            </header>

            <dl className="kv compact">
              <div>
                <dt>Flour</dt>
                <dd>
                  {formatAmount(b.flourTotalG, unit)} — {blendSummary(b)}
                </dd>
              </div>
              <div>
                <dt>Liquid</dt>
                <dd>
                  {formatAmount(b.eggShelledG, unit)} egg
                  {b.yolkG > 0 && ` + ${formatAmount(b.yolkG, unit)} yolk`}
                  {b.addedWaterG > 0 && ` + ${formatAmount(b.addedWaterG, unit)} water`}
                  {b.lyeWaterG > 0 && ` + ${formatAmount(b.lyeWaterG, unit)} lye water`}
                </dd>
              </div>
              <div>
                <dt>Hydration</dt>
                <dd>
                  {round(achievedHydration(b) * 100, 1)} % reached
                  {Math.abs(achievedHydration(b) - b.hydration) > 0.0005 && ` (planned ${round(b.hydration * 100, 1)} %)`}
                </dd>
              </div>
              <div>
                <dt>Rest</dt>
                <dd>
                  {b.restMinMin}–{b.restMaxMin} min
                </dd>
              </div>
              <div>
                <dt>Adjustments</dt>
                <dd>
                  +{formatAmount(b.extraWaterG, unit)} water, +{formatAmount(b.extraSemolinaG, unit)} semolina
                </dd>
              </div>
              <div>
                <dt>Setup</dt>
                <dd>
                  {MACHINES[b.machine].label}
                  {b.pressModel && ` ${BIGOLARO_MODELS[b.pressModel as BigolaroModel]?.label ?? ''}`}
                  {b.die && `, ${b.die}`}
                  {b.ambientC != null && `, ${b.ambientC} °C`}
                </dd>
              </div>
            </dl>

            <div className="rating" role="radiogroup" aria-label="Outcome rating">
              <span>Outcome</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={b.rating === n}
                  aria-label={`${n} of 5`}
                  className={`star${b.rating != null && n <= b.rating ? ' on' : ''}`}
                  onClick={() => update(b.id, { rating: b.rating === n ? null : n })}
                >
                  {n}
                </button>
              ))}
            </div>

            {delta && <p className="delta">{describeDelta(delta, unit)}</p>}

            <div className="field">
              <label htmlFor={`notes-${b.id}`}>Notes</label>
              <textarea
                id={`notes-${b.id}`}
                rows={2}
                value={b.notes}
                placeholder="How did it press? Texture, tearing, cook result…"
                onChange={(e) => update(b.id, { notes: e.target.value })}
              />
            </div>

            {isEditing && <BatchEditor batch={b} unit={unit} onChange={(p) => update(b.id, p)} />}
          </article>
        );
      })}
    </div>
  );
}

function BatchEditor({ batch: b, unit, onChange }: { batch: Batch; unit: Unit; onChange: (p: Partial<Batch>) => void }) {
  return (
    <div className="editor">
      <h3>Edit batch</h3>
      <div className="field">
        <label htmlFor={`date-${b.id}`}>Date</label>
        <input
          id={`date-${b.id}`}
          type="date"
          value={localDate(b.createdAt)}
          onChange={(e) => e.target.value && onChange({ createdAt: withDate(b.createdAt, e.target.value) })}
        />
      </div>
      <div className="field">
        <label htmlFor={`die-${b.id}`}>Die</label>
        <input id={`die-${b.id}`} type="text" value={b.die} onChange={(e) => onChange({ die: e.target.value })} />
      </div>
      <NumField label={`Egg, shelled (${unit})`} value={b.eggShelledG} unit={unit} suffix={unit} onChange={(v) => onChange({ eggShelledG: v ?? 0 })} />
      <NumField label={`Extra yolks (${unit})`} value={b.yolkG} unit={unit} suffix={unit} onChange={(v) => onChange({ yolkG: v ?? 0 })} />
      <NumField label={`Added water (${unit})`} value={b.addedWaterG} unit={unit} suffix={unit} onChange={(v) => onChange({ addedWaterG: v ?? 0 })} />
      <NumField label={`Extra water added during adjustment (${unit})`} value={b.extraWaterG} unit={unit} suffix={unit} onChange={(v) => onChange({ extraWaterG: v ?? 0 })} />
      <NumField label={`Extra semolina added during adjustment (${unit})`} value={b.extraSemolinaG} unit={unit} suffix={unit} onChange={(v) => onChange({ extraSemolinaG: v ?? 0 })} />
      <NumField label={`Total flour (${unit})`} value={b.flourTotalG} unit={unit} suffix={unit} onChange={(v) => onChange({ flourTotalG: v ?? 0 })} />
      <NumField label="Rest, min (minutes)" value={b.restMinMin} suffix="min" onChange={(v) => onChange({ restMinMin: v ?? 0 })} />
      <NumField label="Rest, max (minutes)" value={b.restMaxMin} suffix="min" onChange={(v) => onChange({ restMaxMin: v ?? 0 })} />
      <NumField
        label="Ambient temperature (°C)"
        value={b.ambientC}
        nullable
        suffix="°C"
        onChange={(v) => onChange({ ambientC: v })}
      />
      <BlendEditor blend={b.blend} onChange={(blend) => onChange({ blend })} />
    </div>
  );
}
