import { formatAmount, formatTsp, squeezeAdvice } from '../calc/calc';
import type { Batch, Mode, SqueezeState, Unit } from '../calc/types';

const STATES: { id: SqueezeState; label: string; sub: string }[] = [
  { id: 'crumbly', label: 'Slightly crumbly', sub: 'clumps in hand' },
  { id: 'powdery', label: 'Dry and powdery', sub: "won't clump" },
  { id: 'sticky', label: 'Smooth sticky ball', sub: 'forms a smooth ball' },
];

const KNEAD_STATES: { id: SqueezeState; label: string; sub: string }[] = [
  { id: 'crumbly', label: 'Smooth and firm', sub: 'barely tacky, springs back slowly' },
  { id: 'powdery', label: 'Dry and shaggy', sub: "won't come together" },
  { id: 'sticky', label: 'Sticky', sub: 'clings to hands and board' },
];

interface Props {
  mode: Mode;
  state: SqueezeState | null;
  onState: (s: SqueezeState | null) => void;
  unit: Unit;
  /** Batch flour weight; sizes the corrective steps. */
  flourG: number;
  activeBatch: Batch | undefined;
  onLogAdjust: (p: { waterG?: number; semolinaG?: number }) => void;
}

export function SqueezeTest({ mode, state, onState, unit, flourG, activeBatch, onLogAdjust }: Props) {
  const rolled = mode === 'rolled';
  const advice = state ? squeezeAdvice(state, flourG, mode) : null;
  return (
    <div>
      <p>
        {rolled
          ? 'Knead for several minutes, rest 5 minutes, then press a finger into the dough and tap what you feel:'
          : 'Squeeze a handful of the rested mix, then tap what you feel:'}
      </p>
      <div className="squeeze-grid" role="radiogroup" aria-label={rolled ? 'Knead test result' : 'Squeeze test result'}>
        {(rolled ? KNEAD_STATES : STATES).map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={state === s.id}
            className={`squeeze-btn${state === s.id ? ' selected' : ''}`}
            onClick={() => onState(state === s.id ? null : s.id)}
          >
            <strong>{s.label}</strong>
            <span>{s.sub}</span>
          </button>
        ))}
      </div>

      {advice && (
        <div className={`advice advice-${advice.verdict}`} role="status">
          <strong>{advice.action}</strong>
          {advice.verdict === 'add-water' && (
            <p className="hint">
              Each step is ~1 % of your flour and raises hydration about 1 point
              {rolled ? ', so go slowly: the band is only about 7 points wide' : ', a third of the acceptable band'}. A
              spray bottle spreads small amounts more evenly than pouring.
            </p>
          )}
          {advice.verdict === 'add-semolina' && (
            <p className="hint">Each step is ~2 % of your flour. Sprinkle it over and work it in evenly.</p>
          )}
          {activeBatch && advice.waterStepG != null && (
            <div className="row">
              <button type="button" className="btn" onClick={() => onLogAdjust({ waterG: advice.waterStepG })}>
                Log +{formatAmount(advice.waterStepG, unit)} water ({formatTsp(advice.waterStepG)})
              </button>
              <span className="hint">So far: {formatAmount(activeBatch.extraWaterG, unit)}</span>
            </div>
          )}
          {activeBatch && advice.semolinaStepG != null && (
            <div className="row">
              <button type="button" className="btn" onClick={() => onLogAdjust({ semolinaG: advice.semolinaStepG })}>
                Log +{formatAmount(advice.semolinaStepG, unit)} semolina
              </button>
              <span className="hint">So far: {formatAmount(activeBatch.extraSemolinaG, unit)}</span>
            </div>
          )}
          {advice.verdict !== 'ready' && !activeBatch && (
            <p className="hint">Start a batch to log what you add. Logged adjustments feed your calibrated target.</p>
          )}
        </div>
      )}
    </div>
  );
}
