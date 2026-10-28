import { useEffect, useRef, useState } from 'react';
import { round } from '../calc/calc';
import { detectAmbient, failureMessage } from '../lib/weather';
import type { FormState } from '../storage';
import { NumField } from './NumField';

interface Props {
  form: FormState;
  patch: (p: Partial<FormState>) => void;
}

// One automatic lookup per page load, however many times this field mounts.
let autoRan = false;

/** Ambient temperature: typed by hand, or detected from your location (outdoor air, via Open-Meteo). */
export function AmbientField({ form, patch }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patchRef = useRef(patch);
  patchRef.current = patch;

  const detect = async () => {
    setBusy(true);
    setError(null);
    const r = await detectAmbient();
    setBusy(false);
    if (r.ok) patchRef.current({ ambientC: round(r.tempC, 1), ambientAutoAt: r.at });
    else setError(failureMessage(r.reason));
  };

  useEffect(() => {
    if (form.autoDetect && !autoRan && form.ambientAutoAt == null && form.ambientC == null) {
      autoRan = true;
      void detect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.autoDetect]);

  const time =
    form.ambientAutoAt != null
      ? new Date(form.ambientAutoAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

  return (
    <div className="ambient">
      <NumField
        label="Ambient temperature (°C) — optional"
        value={form.ambientC}
        nullable
        suffix="°C"
        placeholder="20"
        onChange={(v) => patch({ ambientC: v, ambientAutoAt: null })}
      />
      <div className="row">
        <button type="button" className="btn btn-small" onClick={() => void detect()} disabled={busy}>
          {busy ? 'Finding temperature…' : form.ambientAutoAt != null ? 'Refresh from my location' : 'Use my location'}
        </button>
      </div>
      {form.ambientAutoAt != null && (
        <p className="hint">
          Outdoor temperature near you at {time}, from Open-Meteo. Your kitchen may be warmer or cooler: type your room
          temperature if you know it.
        </p>
      )}
      {error && (
        <p className="error" role="status">
          {error}
        </p>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={form.autoDetect}
          onChange={(e) => patch({ autoDetect: e.target.checked })}
        />
        <span>Detect automatically when I open the app</span>
      </label>
      <p className="hint">
        Sends your approximate location (rounded to about 1 km) to open-meteo.com to read the temperature. Nothing is
        stored on a server, and nothing is sent unless you tap the button or turn this on.
      </p>
    </div>
  );
}
