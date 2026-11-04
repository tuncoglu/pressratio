# Google Play release - Pasta & Noodle Calculator

Play app: **Pasta & Noodle Calculator**, package `com.sourdough.pasta`, ENFTC organisation account (free, App, Food & drink).
Launcher label on the phone: **Pasta Dough** (`launcherName` in `twa/twa-manifest.json`).

The app is a **Trusted Web Activity** (Bubblewrap 1.27.0): a thin Android shell that opens https://pasta.sourdoughcalculator.uk full-screen in Chrome. There is no bundled copy of the site, so web changes reach the app without a Play release. Play releases are only needed to change the wrapper itself (icon, name, version, targetSdk).

## Status (2026-10-31)

Console app id `4976268788888229734` (developer id `5715235607958126388`, console URLs `/console/u/1/developers/<dev>/app/<app>/...`), created 2026-10-31 by the user (declaration checkboxes) with the rest driven through Chrome.

| Item | State |
| --- | --- |
| Wrapper project | generated in `twa/` (targetSdk 36, minSdk 24, **location delegation off**, see "Location" below) |
| Bundle | `twa/app-release-bundle.aab` (versionCode 3, 1.0.2) on internal testing and set as the production release 2026-10-31; versionCode 1 crashed on launch (see Known issue below), versionCode 2 had a broken location button (see Location below) (tester list "HR Buzz testers"; opt-in link https://play.google.com/apps/internaltest/4700102875244577146; no review needed for internal) |
| Upload key | `~/.android-keys/pasta-upload.jks`, alias `pasta-upload`, password in `~/.android-keys/CREDENTIALS.txt`, SHA-256 `01:95:73:31:...:9D:D2`. **Back it up.** |
| Play app signing key | SHA-256 `6B:5A:6D:5E:E3:BA:FE:0F:8E:B1:1E:57:54:ED:EF:44:4D:C5:6F:C9:50:C1:1B:F5:EF:C9:AD:18:30:65:13:43` (Console > App signing) |
| Privacy policy page | `public/privacy/index.html` (served at `/privacy/`), linked in the app footer; **deployed 2026-10-31** (Pages project `pasta`, wrangler 4.155.0 direct upload) |
| Digital Asset Links | `public/.well-known/assetlinks.json` lists the Play signing key and the upload key; **deployed 2026-10-31**, served as `application/json`, Google's Digital Asset Links check returns `linked: true` for both keys |
| App content (10 declarations) | all done: privacy URL https://pasta.sourdoughcalculator.uk/privacy/, ads No, sign-in No, content rating (IARC, email emre@enftc.co.uk: Everyone / PEGI 3), target audience 18+, Data safety (approximate + precise location: collected + shared with Open-Meteo, ephemeral, optional, app functionality; encrypted in transit; no accounts), advertising ID No, government No, financial none, health none |
| Store settings | category Food & drink, contact info@sourdoughcalculator.uk + https://pasta.sourdoughcalculator.uk |
| Default store listing | title, short + full description (plain text, "\u2022" bullets), icon, feature graphic, 7 screenshots saved; icon + feature graphic labelled as AI-generated; status "Ready to send for review" |
| Production | versionCode 2 (1.0.1), full rollout, all available countries (set on the Production > Countries/regions tab; the API refuses a release with none). Committed 2026-10-31; Play ran its pre-review checks and sends it for review by itself. The open-testing country changes were bundled into the same submission. |
| Store listing translations | Machine-translated (Play's Gemini service, free, order 16c694dd1v2, 2026-10-31) into tr-TR, de-DE, es-ES, fr-FR, it-IT and applied as store listings. Gemini overshot the 30/80-character title/short limits for tr, es, fr, it, so those were trimmed by hand (see below). The app UI itself is English only. Not proofread by a native speaker beyond Turkish. |
| Sent for review | **yes** (2026-10-31, via Publishing overview "Changes in review"). Submitted a second time the same day with the five translated listings, which cancelled and restarted the first review (Play warns about this). |

## Left to do

1. Done 2026-10-31 on a Pixel 10 Pro XL: installed 1.0.2 from Play (the first install may serve an older cached version; tap Update), opens full-screen with no URL bar, and "Use my location" returns the outdoor temperature once Chrome's site setting for the site is Ask/Allow.
2. Wait for Google's review of the production release (Publishing overview > Submission activity), then check the public listing and install from Play.

Deploy command (from a scratch dir, after `npm run build`):
`CLOUDFLARE_API_TOKEN=$(tr -d '[:space:]' < ~/.cf-token) CLOUDFLARE_ACCOUNT_ID=f217e2d9285193b32d473c8ddb5bc5df npx wrangler@4.155.0 pages deploy <repo>/dist --project-name pasta --branch main`

## Known issue: keep `enableSiteSettingsShortcut` true

With Bubblewrap 1.27.0 + `androidbrowserhelper` 2.7.4, `enableSiteSettingsShortcut: false` omits `ManageDataLauncherActivity` from the manifest, but the library still calls `setComponentEnabledSetting` on it at every launch. The app then crashes immediately (`Component class r0.u does not exist`; `r0.u` is that class after R8). versionCode 1 shipped like this. Keep the flag `true` (it only adds a "Site settings" entry on the app info page). Verified 2026-10-31 by sideloading on a Pixel 10 Pro XL: launches full-screen, no crash.

## Location: leave Trusted Web Activity location delegation off (2026-10-31)

Symptom in versions 1 and 2: "Use my location" always said "Location permission was declined", with no permission prompt. Findings, tested on a Pixel 10 Pro XL (Android 17, current Chrome):

- Bubblewrap 1.27.0 generates `DelegationService` with `android:enabled="@bool/enableNotification"`, which follows `enableNotifications` (false). The location handler lives in that service, so delegation could never work. Enabling the flag (without notifications) registers the service, but Chrome still logs `cr_TWAClient: Unable to request location permission`, never binds the service, and tells the page "denied". Not fixed by that.
- With `features` empty in `twa-manifest.json` (delegation off), Chrome shows its normal "wants to use your device's location" prompt for the site, which is what the page needs.

So `features` is `{}` and the wrapper declares no location permissions; the site asks through Chrome. Do not turn `locationDelegation` back on without testing on a real device. Data safety still says location is collected and shared with Open-Meteo (the page does that), unchanged. Chrome remembers the answer per site: a "Never allow" (or several dismissed prompts) blocks it with no further prompt, and the page just gets "denied". Reset it in Chrome: menu > Settings > Site settings > Location > pasta.sourdoughcalculator.uk > Ask. This is what made 1.0.2 look broken during testing on 2026-10-31 (the app's own "Manage space" shortcut did not open these settings on that phone).

## App language

The web app is now translated into tr, de, es, fr and it (see the README's Languages section), so the translated store listings below no longer promise a language the app lacks. It ships by deploying the website; no Play release is needed because the TWA just opens the site. The footer links to `/privacy/<lang>/` for non-English users; the Play Console privacy URL stays the English `/privacy/`.

## Translated store listings (2026-10-31)

Console > Grow users > Translations > **Store listings and products** > Create order > *Machine translation at no cost* (the order form preselects paid human translation, so check). Then "Review and apply" per language. Reopening a draft resets it to Gemini's original text, so make all edits in one go before Apply. A separate **App strings** translation page exists (translates `strings.xml` in future bundles); it is not enabled because the app is a web wrapper with almost no Android strings.

| Lang | Title (30) | Short description (80) |
| --- | --- | --- |
| tr-TR | Makarna & Erişte Hesaplayıcısı | El presi, ekstrüder ve açma makarna için makarna ve erişte hamuru hidrasyonu |
| de-DE | Pasta- und Nudelrechner | Teighydratation für Pasta und Nudeln bei Handpressen, Extrudern und Nudelwalzen |
| es-ES | Calculadora de pasta y fideos | Hidratación de masa para pasta y fideos con prensa manual, extrusora o rodillo |
| fr-FR | Calculateur Pâtes & Nouilles | Hydratation de pâte à pâtes et nouilles : presse, extrudeuse ou laminoir |
| it-IT | Calcolatore pasta e noodles | Idratazione dell'impasto per pasta e noodles: pressa, estrusore, mattarello |

Turkish full description edits: "karbonat ağırlığı" to "kabartma sodası ağırlığı", "analiz yok" to "analitik yok". The other full descriptions are Gemini's text, unedited.

## Why the asset links matter

Without `https://pasta.sourdoughcalculator.uk/.well-known/assetlinks.json` listing the signing certificate that Play installs, the TWA falls back to a browser bar instead of full-screen. Play re-signs with its own **app signing key**, so the fingerprint to add is the one Console shows under App signing (SHA-256), not the upload key. Both fingerprints are in the file (the upload key lets a locally built APK verify too).

## Data safety answers (to enter in Console)

- Location, approximate **and** precise (the page asks Chrome for it; since 1.0.2 the wrapper itself no longer holds `ACCESS_FINE_LOCATION`/`COARSE_LOCATION`; coordinates are rounded to ~0.01 degree, about 1 km, which is finer than Google's 3 km2 "approximate" threshold): collected, shared with Open-Meteo, ephemeral, optional, app functionality, encrypted in transit.
- No personal info, financial, health, messages, photos, contacts, identifiers, ads, accounts. Government app: no. Ads: no. Target audience 18+ like the sister apps.
- Policy URL: https://pasta.sourdoughcalculator.uk/privacy/

## Build

```bash
cd twa
export JAVA_HOME=~/.jdks/temurin-17                   # Bubblewrap config; JDK 25 breaks Gradle
export BUBBLEWRAP_KEYSTORE_PASSWORD=...  BUBBLEWRAP_KEY_PASSWORD=...   # same value, from CREDENTIALS.txt
npx @bubblewrap/cli@1.27.0 update --skipVersionUpgrade --manifest=twa-manifest.json   # after editing twa-manifest.json
npx @bubblewrap/cli@1.27.0 build --skipPwaValidation      # local signed build, for sideloading
```

**Uploading goes through GitHub Actions** (since 2026-11-04): Actions → **Play release** → Run
workflow (`.github/workflows/play-release.yml`). No Play service-account key exists anywhere: the
workflow gets a one-hour token through Workload Identity Federation (pool `github`, provider
`pressratio-production`, service account `play-ci-pasta`, which only accepts this repo's
`production` environment on `main`). Every run waits for the owner's approval.

- `status`: read-only list of tracks and releases.
- `upload-internal`: builds `twa/` with Gradle (unsigned) and uploads to the internal track. Run
  `bubblewrap update` after bumping `appVersionCode`/`appVersion` in `twa-manifest.json` and commit
  the regenerated `twa/app/build.gradle` first; the workflow reads the version from there.
- `promote-production`: points production at an uploaded versionCode, with optional en-GB notes.

The build job has no secrets. The `play` job installs nothing: it signs the bundle with the upload
key (environment secret, SHA-256 `01:95:73:31…`, checked) using the JDK's jarsigner.

Notes:
- The version name field in `twa-manifest.json` is `appVersion` (not `appVersionName`; the wrong name is silently ignored and gives an empty versionName). `appVersionCode` must rise for every upload.
- minSdk must be at least 24: `androidbrowserhelper` 2.7.4 refuses 23.
- `~/.bubblewrap/config.json` points at `/home/emre/.jdks/temurin-17` and `/opt/android-sdk`.

## Store assets

Screenshots are rendered from `dist/` by headless Chromium at 360x720 @3 = 1080x2160, with sample batches seeded into `localStorage` (key `pressratio.v1`). The script lived in the session scratchpad (node + playwright-core from `~/Projects/EU-AI-Act-ISO-42001/.ds-sync/node_modules`, `/usr/bin/chromium-browser`, serve `dist/` from a tiny node http server, `serviceWorkers: 'block'`). Rebuild with `npm run build` first. The feature graphic is a 1024x500 HTML page rendered the same way. The icon is `public/icons/icon-512.png`, drawn in code by `scripts/make-icons.mjs`, so the Console AI-generated-assets declaration should label it.

## Changes made to the web app for Play

- `public/privacy/index.html` and a "Privacy policy" footer link (`src/App.tsx`, `.legal` in `styles.css`).
- `public/sw.js`: navigations to `/privacy` and `/privacy/` get the cached privacy page instead of the app shell (checked online and offline in headless Chromium).
- `vite.config.ts`: `.well-known/` is excluded from the service worker's precache list.
- `.seg` no longer shrinks, so the grams/ounces toggle is not clipped at 360 px width.
