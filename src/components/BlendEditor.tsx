import { BLEND_PRESETS, FLOUR_KEYS, blendSum, flourName, setShare } from '../calc/calc';
import type { Blend } from '../calc/types';
import { t, tx } from '../i18n';

export function BlendEditor({ blend, onChange }: { blend: Blend; onChange: (b: Blend) => void }) {
  const total = blendSum(blend);
  return (
    <fieldset className="card-section">
      <legend>{t('blend.legend')}</legend>
      <div className="chips">
        {BLEND_PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" onClick={() => onChange(p.blend)}>
            {tx(p.label)}
          </button>
        ))}
      </div>
      {FLOUR_KEYS.map((k) => (
        <div className="slider-row" key={k}>
          <label htmlFor={`blend-${k}`}>{flourName(k)}</label>
          <input
            id={`blend-${k}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={blend[k]}
            onChange={(e) => onChange(setShare(blend, k, Number(e.target.value)))}
          />
          <output>{t('fmt.pct', { v: blend[k] })}</output>
        </div>
      ))}
      <p className={total === 100 ? 'hint' : 'hint error'}>{t('blend.total', { v: total })}</p>
    </fieldset>
  );
}
