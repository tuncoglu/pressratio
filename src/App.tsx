import { useEffect, useState } from 'react';
import type { Batch, Unit } from './calc/types';
import { BatchLog } from './components/BatchLog';
import { Calculator } from './components/Calculator';
import { loadState, saveState, type AppState, type FormState } from './storage';

type Tab = 'calc' | 'log';

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('calc');

  useEffect(() => saveState(state), [state]);

  const setUnit = (unit: Unit) => setState((s) => ({ ...s, unit }));
  const setForm = (form: FormState) => setState((s) => ({ ...s, form }));
  const setBatches = (batches: Batch[]) => setState((s) => ({ ...s, batches }));
  const activeBatch = state.batches.find((b) => b.id === state.activeBatchId);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Pasta &amp; Noodle Dough Calculator</h1>
          <p className="subtitle">Hand-press, extruder and noodle recipes</p>
          <p className="tagline">Guidance, not guarantee.</p>
        </div>
        <div className="seg" role="radiogroup" aria-label="Units">
          {(['g', 'oz'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={state.unit === u}
              className={state.unit === u ? 'on' : ''}
              onClick={() => setUnit(u)}
            >
              {u === 'g' ? 'grams' : 'ounces'}
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

      <footer className="legal">
        <a href="./privacy/">Privacy policy</a>
      </footer>

      <nav className="tabs" aria-label="Screens">
        <button type="button" className={tab === 'calc' ? 'on' : ''} aria-current={tab === 'calc'} onClick={() => setTab('calc')}>
          Calculator
        </button>
        <button type="button" className={tab === 'log' ? 'on' : ''} aria-current={tab === 'log'} onClick={() => setTab('log')}>
          Batch log{state.batches.length > 0 ? ` (${state.batches.length})` : ''}
        </button>
      </nav>
    </div>
  );
}
