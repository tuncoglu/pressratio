import { useRef, useState } from 'react';
import { FLOUR_KEYS, achievedHydration, deltaVsPrevious, describeDelta, flourNameLc, formatAmount, round } from '../calc/calc';
import { localeTag, n, pct, t, tp, tx } from '../i18n';
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
      return `${pct(b.blend[k])} ${f?.product ? tx(f.label!) : flourNameLc(k)}`;
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
  // The text is a function so it is translated when shown, not when it was produced.
  const [message, setMessage] = useState<{ ok: boolean; text: () => string } | null>(null);
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
    const count = batches.length;
    setMessage({ ok: true, text: () => tp('log.exported', count) });
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const res = parseImport(await file.text());
    if (!res.ok) {
      setMessage({ ok: false, text: () => tx(res.error) });
    } else {
      onChange(mergeBatches(batches, res.batches));
      const { skipped } = res;
      const count = res.batches.length;
      setMessage({
        ok: true,
        text: () => (skipped ? tp('log.importedSkipped', count, { skipped }) : tp('log.imported', count)),
      });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const sorted = sortBatches(batches);

  return (
    <div className="stack">
      <section className="card">
        <h2>{t('log.title')}</h2>
        <div className="row">
          <button type="button" className="btn" onClick={doExport} disabled={batches.length === 0}>
            {t('log.export')}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            {t('log.import')}
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
            {message.text()}
          </p>
        )}
        <p className="hint">{t('log.hintLocal')}</p>
        <p className="hint">{t('log.hintRate')}</p>
      </section>

      {sorted.length === 0 && (
        <p className="muted center">{t('log.empty')}</p>
      )}

      {sorted.map((b) => {
        const delta = deltaVsPrevious(b, batches);
        const isEditing = editing === b.id;
        return (
          <article key={b.id} className={`card batch${b.id === activeBatchId ? ' active' : ''}`}>
            <header className="batch-head">
              <div>
                <strong>{new Date(b.createdAt).toLocaleDateString(localeTag())}</strong>{' '}
                <span className="tag">{tx(MODE_SHORT[b.mode])}</span>
                {b.id === activeBatchId && <span className="tag tag-active">{t('log.current')}</span>}
              </div>
              <div className="row">
                <button type="button" className="btn btn-small" onClick={() => setEditing(isEditing ? null : b.id)}>
                  {isEditing ? t('log.done') : t('log.edit')}
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
                  {confirmDelete === b.id ? t('log.confirm') : t('log.delete')}
                </button>
              </div>
            </header>

            <dl className="kv compact">
              <div>
                <dt>{t('log.flour')}</dt>
                <dd>
                  {formatAmount(b.flourTotalG, unit)} — {blendSummary(b)}
                </dd>
              </div>
              <div>
                <dt>{t('log.liquid')}</dt>
                <dd>
                  {t('log.liq.egg', { a: formatAmount(b.eggShelledG, unit) })}
                  {b.yolkG > 0 && t('log.liq.yolk', { a: formatAmount(b.yolkG, unit) })}
                  {b.addedWaterG > 0 && t('log.liq.water', { a: formatAmount(b.addedWaterG, unit) })}
                  {b.lyeWaterG > 0 && t('log.liq.lye', { a: formatAmount(b.lyeWaterG, unit) })}
                </dd>
              </div>
              <div>
                <dt>{t('log.hydration')}</dt>
                <dd>
                  {t('log.reached', { v: pct(round(achievedHydration(b) * 100, 1)) })}
                  {Math.abs(achievedHydration(b) - b.hydration) > 0.0005 &&
                    t('log.planned', { v: pct(round(b.hydration * 100, 1)) })}
                </dd>
              </div>
              <div>
                <dt>{t('log.rest')}</dt>
                <dd>
                  {t('res.restTime', { a: b.restMinMin, b: b.restMaxMin })}
                </dd>
              </div>
              <div>
                <dt>{t('log.adjustments')}</dt>
                <dd>
                  {t('log.adjVal', { w: formatAmount(b.extraWaterG, unit), s: formatAmount(b.extraSemolinaG, unit) })}
                </dd>
              </div>
              <div>
                <dt>{t('log.setup')}</dt>
                <dd>
                  {tx(MACHINES[b.machine].label)}
                  {b.pressModel && ` ${BIGOLARO_MODELS[b.pressModel as BigolaroModel]?.label ?? ''}`}
                  {b.die && `, ${b.die}`}
                  {b.ambientC != null && `, ${n(b.ambientC)} °C`}
                </dd>
              </div>
            </dl>

            <div className="rating" role="radiogroup" aria-label={t('log.outcomeAria')}>
              <span>{t('log.outcome')}</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={b.rating === i}
                  aria-label={t('log.stars', { n: i })}
                  className={`star${b.rating != null && i <= b.rating ? ' on' : ''}`}
                  onClick={() => update(b.id, { rating: b.rating === i ? null : i })}
                >
                  {i}
                </button>
              ))}
            </div>

            {delta && <p className="delta">{describeDelta(delta, unit)}</p>}

            <div className="field">
              <label htmlFor={`notes-${b.id}`}>{t('log.notes')}</label>
              <textarea
                id={`notes-${b.id}`}
                rows={2}
                value={b.notes}
                placeholder={t('log.notesHint')}
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
      <h3>{t('log.editBatch')}</h3>
      <div className="field">
        <label htmlFor={`date-${b.id}`}>{t('log.date')}</label>
        <input
          id={`date-${b.id}`}
          type="date"
          value={localDate(b.createdAt)}
          onChange={(e) => e.target.value && onChange({ createdAt: withDate(b.createdAt, e.target.value) })}
        />
      </div>
      <div className="field">
        <label htmlFor={`die-${b.id}`}>{t('log.die')}</label>
        <input id={`die-${b.id}`} type="text" value={b.die} onChange={(e) => onChange({ die: e.target.value })} />
      </div>
      <NumField label={t('log.ed.egg', { unit })} value={b.eggShelledG} unit={unit} suffix={unit} onChange={(v) => onChange({ eggShelledG: v ?? 0 })} />
      <NumField label={t('log.ed.yolk', { unit })} value={b.yolkG} unit={unit} suffix={unit} onChange={(v) => onChange({ yolkG: v ?? 0 })} />
      <NumField label={t('log.ed.water', { unit })} value={b.addedWaterG} unit={unit} suffix={unit} onChange={(v) => onChange({ addedWaterG: v ?? 0 })} />
      <NumField label={t('log.ed.extraWater', { unit })} value={b.extraWaterG} unit={unit} suffix={unit} onChange={(v) => onChange({ extraWaterG: v ?? 0 })} />
      <NumField label={t('log.ed.extraSemolina', { unit })} value={b.extraSemolinaG} unit={unit} suffix={unit} onChange={(v) => onChange({ extraSemolinaG: v ?? 0 })} />
      <NumField label={t('log.ed.flour', { unit })} value={b.flourTotalG} unit={unit} suffix={unit} onChange={(v) => onChange({ flourTotalG: v ?? 0 })} />
      <NumField label={t('log.ed.restMin')} value={b.restMinMin} suffix="min" onChange={(v) => onChange({ restMinMin: v ?? 0 })} />
      <NumField label={t('log.ed.restMax')} value={b.restMaxMin} suffix="min" onChange={(v) => onChange({ restMaxMin: v ?? 0 })} />
      <NumField
        label={t('log.ed.ambient')}
        value={b.ambientC}
        nullable
        suffix="°C"
        onChange={(v) => onChange({ ambientC: v })}
      />
      <BlendEditor blend={b.blend} onChange={(blend) => onChange({ blend })} />
    </div>
  );
}
