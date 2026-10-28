import { BLEND_PRESETS, FLOUR_KEYS, FLOUR_LABELS, blendSum, setShare } from '../calc/calc';
import type { Blend } from '../calc/types';

export function BlendEditor({ blend, onChange }: { blend: Blend; onChange: (b: Blend) => void }) {
  const total = blendSum(blend);
  return (
    <fieldset className="card-section">
      <legend>Flour blend</legend>
      <div className="chips">
        {BLEND_PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" onClick={() => onChange(p.blend)}>
            {p.label}
          </button>
        ))}
      </div>
      {FLOUR_KEYS.map((k) => (
        <div className="slider-row" key={k}>
          <label htmlFor={`blend-${k}`}>{FLOUR_LABELS[k]}</label>
          <input
            id={`blend-${k}`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={blend[k]}
            onChange={(e) => onChange(setShare(blend, k, Number(e.target.value)))}
          />
          <output>{blend[k]} %</output>
        </div>
      ))}
      <p className={total === 100 ? 'hint' : 'hint error'}>Total: {total} % (other flours rebalance automatically)</p>
    </fieldset>
  );
}
