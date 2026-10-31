import { PLACEHOLDERS, type PlaceholderId } from '../calc/constants';
import { t, tx } from '../i18n';

/** Small flag for values that come from a PLACEHOLDER constant. */
export function Uncalibrated({ id }: { id?: PlaceholderId }) {
  return (
    <span className="badge badge-warn" title={id ? tx(PLACEHOLDERS[id].label) : undefined}>
      {t('bits.uncalibrated')}
    </span>
  );
}

export function Unvalidated() {
  return <span className="badge badge-danger">{t('bits.unvalidated')}</span>;
}

/** Always-visible list of the placeholder constants a result depends on. */
export function UncalibratedList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="note note-warn">
      <strong>{t('bits.listTitle')}</strong>
      <ul>
        {ids.map((id) => {
          const p = PLACEHOLDERS[id as PlaceholderId];
          return (
            <li key={id}>
              {tx(p.label)}: <em>{tx(p.value)}</em>
            </li>
          );
        })}
      </ul>
      <p className="hint">{t('bits.listNote')}</p>
    </div>
  );
}
