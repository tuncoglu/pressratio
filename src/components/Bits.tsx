import { PLACEHOLDERS, type PlaceholderId } from '../calc/constants';

/** Small flag for values that come from a PLACEHOLDER constant. */
export function Uncalibrated({ id }: { id?: PlaceholderId }) {
  return (
    <span className="badge badge-warn" title={id ? PLACEHOLDERS[id].label : undefined}>
      uncalibrated
    </span>
  );
}

export function Unvalidated() {
  return <span className="badge badge-danger">unvalidated</span>;
}

/** Always-visible list of the placeholder constants a result depends on. */
export function UncalibratedList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="note note-warn">
      <strong>Uncalibrated values in this result</strong>
      <ul>
        {ids.map((id) => {
          const p = PLACEHOLDERS[id as PlaceholderId];
          return (
            <li key={id}>
              {p.label}: <em>{p.value}</em>
            </li>
          );
        })}
      </ul>
      <p className="hint">Placeholders until you calibrate them from your own batches.</p>
    </div>
  );
}
