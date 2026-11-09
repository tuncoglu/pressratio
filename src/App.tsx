import { useEffect, useState } from 'react';
import type { Batch, Unit } from './calc/types';
import { BatchLog } from './components/BatchLog';
import { Calculator } from './components/Calculator';
import { StoreLinks } from './components/StoreLinks';
import { LOCALES, isLocale, setLocale, t } from './i18n';
import { loadState, saveState, type AppState, type FormState } from './storage';

type Tab = 'calc' | 'log';

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('calc');

  // Set before the children render, so everything below reads the right language.
  setLocale(state.locale);
  useEffect(() => {
    document.title = t('app.title');
  }, [state.locale]);

  useEffect(() => saveState(state), [state]);

  const setUnit = (unit: Unit) => setState((s) => ({ ...s, unit }));
  const setForm = (form: FormState) => setState((s) => ({ ...s, form }));
  const setBatches = (batches: Batch[]) => setState((s) => ({ ...s, batches }));
  const activeBatch = state.batches.find((b) => b.id === state.activeBatchId);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
        <div className="seg" role="radiogroup" aria-label={t('app.units')}>
          {(['g', 'oz'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={state.unit === u}
              className={state.unit === u ? 'on' : ''}
              onClick={() => setUnit(u)}
            >
              {u === 'g' ? t('unit.grams') : t('unit.ounces')}
            </button>
          ))}
        </div>
      </header>

      <main>
        {tab === 'calc' ? (
          <Calculator
            form={state.form}
            setForm={setForm}
            unit={state.unit}
            batches={state.batches}
            activeBatch={activeBatch}
            onStart={(b) =>
              setState((s) => ({ ...s, batches: [b, ...s.batches], activeBatchId: b.id }))
            }
            onLogAdjust={({ waterG = 0, semolinaG = 0 }) =>
              setState((s) => ({
                ...s,
                batches: s.batches.map((b) =>
                  b.id === s.activeBatchId
                    ? { ...b, extraWaterG: b.extraWaterG + waterG, extraSemolinaG: b.extraSemolinaG + semolinaG }
                    : b,
                ),
              }))
            }
            onOpenLog={() => setTab('log')}
          />
        ) : (
          <BatchLog
            batches={state.batches}
            unit={state.unit}
            activeBatchId={state.activeBatchId}
            onChange={setBatches}
          />
        )}
      </main>

      <div className="store-wrap">
        <StoreLinks />
      </div>

      <footer className="legal">
        <label className="lang">
          <span>{t('app.language')}</span>
          <select
            value={state.locale}
            onChange={(e) => isLocale(e.target.value) && setState((s) => ({ ...s, locale: e.target.value as AppState['locale'] }))}
          >
            {LOCALES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <a href={state.locale === 'en' ? './privacy/' : `./privacy/${state.locale}/`}>{t('legal.privacy')}</a>
      </footer>

      <nav className="tabs" aria-label={t('app.screens')}>
        <button type="button" className={tab === 'calc' ? 'on' : ''} aria-current={tab === 'calc'} onClick={() => setTab('calc')}>
          {t('tab.calculator')}
        </button>
        <button type="button" className={tab === 'log' ? 'on' : ''} aria-current={tab === 'log'} onClick={() => setTab('log')}>
          {state.batches.length > 0 ? t('tab.log_n', { count: state.batches.length }) : t('tab.log')}
        </button>
      </nav>
    </div>
  );
}
