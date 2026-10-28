import { formatAmount, formatTsp, ravioliPlan, round } from '../calc/calc';
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
      <legend>Ravioli filling</legend>
      <div className="chips" role="group" aria-label="Ravioli size">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${form.ravioliCm === s ? ' chip-on' : ''}`}
            aria-pressed={form.ravioliCm === s}
            onClick={() => patch({ ravioliCm: s })}
          >
            {s} cm square
          </button>
        ))}
      </div>
      <NumField
        label="Ravioli size, side (cm)"
        value={form.ravioliCm}
        suffix="cm"
        onChange={(v) => patch({ ravioliCm: v && v > 0 ? v : 5 })}
      />
      <NumField
        label={`Your filling per ravioli (${unit}) — optional`}
        value={form.fillingG}
        nullable
        unit={unit}
        suffix={unit}
        placeholder="auto"
        onChange={(v) => patch({ fillingG: v })}
        hint="Weigh what you actually spoon in and enter it here; the guide then uses your figure."
      />
      <div className="field">
        <label htmlFor="portion">Serving</label>
        <select
          id="portion"
          value={form.ravioliPortion}
          onChange={(e) => patch({ ravioliPortion: e.target.value as RavioliPortion })}
        >
          <option value="starter">First course ({RAVIOLI_PORTION_G.starter} g per person)</option>
          <option value="main">Main course ({RAVIOLI_PORTION_G.main} g per person)</option>
        </select>
      </div>

      {p && p.count > 0 ? (
        <div className="precision precision-loads">
          <p>
            <strong>
              ≈ {p.count} ravioli ({form.ravioliCm} cm) need {formatAmount(p.fillingTotalG, unit)} of filling
            </strong>
          </p>
          <dl className="kv compact">
            <div>
              <dt>Filling each</dt>
              <dd>
                {formatAmount(p.fillingPerG, unit)} (≈ {formatTsp(p.fillingPerG)})
                {form.fillingG == null && <> <Uncalibrated id="FILLING_G_PER_CM2" /></>}
              </dd>
            </div>
            <div>
              <dt>Dough each</dt>
              <dd>
                {formatAmount(p.doughPerG, unit)} (two layers at {thicknessMm} mm)
              </dd>
            </div>
            <div>
              <dt>Filling : dough</dt>
              <dd>{round(p.fillingToDough, 1)} : 1</dd>
            </div>
            <div>
              <dt>Serves</dt>
              <dd>
                ≈ {round(p.servings, 1)} ({round(p.piecesPerServing)} ravioli each)
              </dd>
            </div>
          </dl>
          <p className="hint">
            Counts a perfect cut with no waste; re-rolled trimmings mean slightly fewer in practice. Too little filling
            leaves doughy ravioli; too much strains the seam.
          </p>
        </div>
      ) : (
        <p className="muted">Enter a size to see the count.</p>
      )}
    </fieldset>
  );
}
