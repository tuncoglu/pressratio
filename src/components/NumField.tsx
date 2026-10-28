import { useEffect, useId, useState } from 'react';
import { gToUnit, round, unitToG } from '../calc/calc';
import type { Unit } from '../calc/types';

interface Props {
  /** Fixed DOM id, for focusing the field from outside. */
  id?: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  /** When set, `value` is grams shown in this unit. Omit for plain numbers. */
  unit?: Unit;
  /** Empty input means null (optional field) instead of 0. */
  nullable?: boolean;
  suffix?: string;
  placeholder?: string;
  hint?: string;
}

/**
 * Text input that keeps its own draft so typing "1." or clearing the field
 * works, while still tracking the numeric value (and unit changes) outside.
 */
export function NumField({ id: fixedId, label, value, onChange, unit, nullable, suffix, placeholder, hint }: Props) {
  const autoId = useId();
  const id = fixedId ?? autoId;
  const show = (v: number | null) =>
    v == null ? '' : String(round(unit ? gToUnit(v, unit) : v, unit === 'oz' ? 2 : 1));
  const [draft, setDraft] = useState(show(value));

  useEffect(() => {
    const p = parseFloat(draft);
    const current = Number.isFinite(p) && p >= 0 ? (unit ? unitToG(p, unit) : p) : nullable ? null : 0;
    const same = current === value || (current != null && value != null && Math.abs(current - value) < 1e-6);
    if (!same) setDraft(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unit]);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^\d*[.,]?\d*$/.test(t)) return;
            setDraft(t);
            const p = parseFloat(t.replace(',', '.'));
            if (!Number.isFinite(p)) onChange(nullable ? null : 0);
            else onChange(unit ? unitToG(p, unit) : p);
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
