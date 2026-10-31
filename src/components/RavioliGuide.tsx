import { formatAmount, formatTsp, ravioliPlan, round } from '../calc/calc';
import { n, t } from '../i18n';
import { RAVIOLI_PORTION_G, type RavioliPortion } from '../calc/constants';
import type { Unit } from '../calc/types';
import type { FormState } from '../storage';
import { Uncalibrated } from './Bits';
import { NumField } from './NumField';

interface Props {
  form: FormState;
  patch: (p: Partial<FormState>) => void;
  doughG: number;
  thicknessMm: number;
  unit: Unit;
}

const SIZES = [4, 5, 6];

/** How many ravioli the dough makes and how much filling they need. */
export function RavioliGuide({ form, patch, doughG, thicknessMm, unit }: Props) {
  const p = ravioliPlan(doughG, thicknessMm, form.ravioliCm, form.ravioliPortion, form.fillingG);
  return (
    <fieldset className="card">
      <legend>{t('rav.legend')}</legend>
      <div className="chips" role="group" aria-label={t('rav.sizeGroup')}>
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${form.ravioliCm === s ? ' chip-on' : ''}`}
            aria-pressed={form.ravioliCm === s}
            onClick={() => patch({ ravioliCm: s })}
          >
            {t('rav.chip', { s })}
          </button>
        ))}
      </div>
      <NumField
        label={t('rav.side')}
        value={form.ravioliCm}
        suffix="cm"
        onChange={(v) => patch({ ravioliCm: v && v > 0 ? v : 5 })}
      />
      <NumField
        label={t('rav.filling', { unit })}
        value={form.fillingG}
        nullable
        unit={unit}
        suffix={unit}
        placeholder={t('rav.auto')}
        onChange={(v) => patch({ fillingG: v })}
        hint={t('rav.fillingHint')}
      />
      <div className="field">
        <label htmlFor="portion">{t('rav.serving')}</label>
        <select
          id="portion"
          value={form.ravioliPortion}
          onChange={(e) => patch({ ravioliPortion: e.target.value as RavioliPortion })}
        >
          <option value="starter">{t('rav.starter', { g: RAVIOLI_PORTION_G.starter })}</option>
          <option value="main">{t('rav.main', { g: RAVIOLI_PORTION_G.main })}</option>
        </select>
      </div>

      {p && p.count > 0 ? (
        <div className="precision precision-loads">
          <p>
            <strong>
              {t('rav.headline', { count: p.count, cm: form.ravioliCm, filling: formatAmount(p.fillingTotalG, unit) })}
            </strong>
          </p>
          <dl className="kv compact">
            <div>
              <dt>{t('rav.each')}</dt>
              <dd>
                {t('rav.eachVal', { a: formatAmount(p.fillingPerG, unit), tsp: formatTsp(p.fillingPerG) })}
                {form.fillingG == null && <> <Uncalibrated id="FILLING_G_PER_CM2" /></>}
              </dd>
            </div>
            <div>
              <dt>{t('rav.dough')}</dt>
              <dd>
                {t('rav.doughVal', { a: formatAmount(p.doughPerG, unit), mm: thicknessMm })}
              </dd>
            </div>
            <div>
              <dt>{t('rav.ratio')}</dt>
              <dd>{n(round(p.fillingToDough, 1))} : 1</dd>
            </div>
            <div>
              <dt>{t('rav.serves')}</dt>
              <dd>
                {t('rav.servesVal', { s: round(p.servings, 1), p: round(p.piecesPerServing) })}
              </dd>
            </div>
          </dl>
          <p className="hint">{t('rav.note')}</p>
        </div>
      ) : (
        <p className="muted">{t('rav.enter')}</p>
      )}
    </fieldset>
  );
}
