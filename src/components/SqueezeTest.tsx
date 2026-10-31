import { formatAmount, formatTsp, squeezeAdvice } from '../calc/calc';
import type { Batch, Mode, SqueezeState, Unit } from '../calc/types';
import { m, t, tx, type Msg } from '../i18n';

const STATES: { id: SqueezeState; label: Msg; sub: Msg }[] = [
  { id: 'crumbly', label: m('sqs.ext.crumbly.label'), sub: m('sqs.ext.crumbly.sub') },
  { id: 'powdery', label: m('sqs.ext.powdery.label'), sub: m('sqs.ext.powdery.sub') },
  { id: 'sticky', label: m('sqs.ext.sticky.label'), sub: m('sqs.ext.sticky.sub') },
];

const KNEAD_STATES: { id: SqueezeState; label: Msg; sub: Msg }[] = [
  { id: 'crumbly', label: m('sqs.knead.crumbly.label'), sub: m('sqs.knead.crumbly.sub') },
  { id: 'powdery', label: m('sqs.knead.powdery.label'), sub: m('sqs.knead.powdery.sub') },
  { id: 'sticky', label: m('sqs.knead.sticky.label'), sub: m('sqs.knead.sticky.sub') },
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
      <p>{rolled ? t('sqs.intro.rolled') : t('sqs.intro.ext')}</p>
      <div
        className="squeeze-grid"
        role="radiogroup"
        aria-label={rolled ? t('sqs.aria.knead') : t('sqs.aria.squeeze')}
      >
        {(rolled ? KNEAD_STATES : STATES).map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={state === s.id}
            className={`squeeze-btn${state === s.id ? ' selected' : ''}`}
            onClick={() => onState(state === s.id ? null : s.id)}
          >
            <strong>{tx(s.label)}</strong>
            <span>{tx(s.sub)}</span>
          </button>
        ))}
      </div>

      {advice && (
        <div className={`advice advice-${advice.verdict}`} role="status">
          <strong>{tx(advice.action)}</strong>
          {advice.verdict === 'add-water' && (
            <p className="hint">{rolled ? t('sqs.hint.water.rolled') : t('sqs.hint.water.ext')}</p>
          )}
          {advice.verdict === 'add-semolina' && <p className="hint">{t('sqs.hint.semolina')}</p>}
          {activeBatch && advice.waterStepG != null && (
            <div className="row">
              <button type="button" className="btn" onClick={() => onLogAdjust({ waterG: advice.waterStepG })}>
                {t('sqs.logWater', { a: formatAmount(advice.waterStepG, unit), tsp: formatTsp(advice.waterStepG) })}
              </button>
              <span className="hint">{t('sqs.soFar', { a: formatAmount(activeBatch.extraWaterG, unit) })}</span>
            </div>
          )}
          {activeBatch && advice.semolinaStepG != null && (
            <div className="row">
              <button type="button" className="btn" onClick={() => onLogAdjust({ semolinaG: advice.semolinaStepG })}>
                {t('sqs.logSemolina', { a: formatAmount(advice.semolinaStepG, unit) })}
              </button>
              <span className="hint">{t('sqs.soFar', { a: formatAmount(activeBatch.extraSemolinaG, unit) })}</span>
            </div>
          )}
          {advice.verdict !== 'ready' && !activeBatch && <p className="hint">{t('sqs.startBatch')}</p>}
        </div>
      )}
    </div>
  );
}
