import { useRef } from 'react';
import { t } from '../i18n';

/** The Android app on Google Play. `referrer` shows up in the Play Console as the traffic source. */
export const PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.sourdough.pasta&referrer=utm_source%3Dpasta.sourdoughcalculator.uk%26utm_medium%3Dwebsite';

/**
 * Where to get the app: a Google Play link, and an App Store button for the iPhone app that is not out
 * yet. That one opens an explanation with the Safari "Add to Home Screen" route to use in the meantime.
 * Nothing is counted or sent anywhere: this app has no analytics.
 *
 * Hidden by the stylesheet once the page runs as an installed app (display-mode: standalone), which
 * includes the Play app itself, a Trusted Web Activity.
 */
export function StoreLinks() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <section className="card store-links" aria-label={t('store.group')}>
      <p className="store-label">{t('store.group')}</p>
      <div className="store-buttons">
        <a className="store-button" href={PLAY_URL}>
          <span className="store-small">{t('store.getItOn')}</span>
          <span className="store-big">Google Play</span>
        </a>
        <button type="button" className="store-button" onClick={() => dialog.current?.showModal()}>
          <span className="store-small">{t('store.downloadOn')}</span>
          <span className="store-big">App Store</span>
        </button>
      </div>
      <dialog
        ref={dialog}
        className="store-dialog"
        aria-labelledby="store-dialog-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <h2 id="store-dialog-title">{t('store.title')}</h2>
        <p>{t('store.lead')}</p>
        <h3>{t('store.stepsTitle')}</h3>
        <ol>
          <li>{t('store.step1')}</li>
          <li>{t('store.step2')}</li>
          <li>{t('store.step3')}</li>
          <li>{t('store.step4')}</li>
        </ol>
        <form method="dialog">
          <button className="store-close" autoFocus>
            {t('store.close')}
          </button>
        </form>
      </dialog>
    </section>
  );
}
