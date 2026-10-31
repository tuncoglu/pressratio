# Google Play release - Pasta & Noodle Calculator

Play app: **Pasta & Noodle Calculator**, package `com.sourdough.pasta`, ENFTC organisation account (free, App, Food & drink).
Launcher label on the phone: **Pasta Dough** (`launcherName` in `twa/twa-manifest.json`).

The app is a **Trusted Web Activity** (Bubblewrap 1.27.0): a thin Android shell that opens https://pasta.sourdoughcalculator.uk full-screen in Chrome. There is no bundled copy of the site, so web changes reach the app without a Play release. Play releases are only needed to change the wrapper itself (icon, name, version, targetSdk).

## Status (2026-10-31)

Console app id `4976268788888229734` (developer id `5715235607958126388`, console URLs `/console/u/1/developers/<dev>/app/<app>/...`), created 2026-10-31 by the user (declaration checkboxes) with the rest driven through Chrome.

| Item | State |
| --- | --- |
| Wrapper project | generated in `twa/` (targetSdk 36, minSdk 24, location delegation on) |
| Bundle | `twa/app-release-bundle.aab` (versionCode 1, 1.0.0) **rolled out to internal testing 2026-10-31** (tester list "HR Buzz testers"; opt-in link https://play.google.com/apps/internaltest/4700102875244577146; no review needed for internal) |
| Upload key | `~/.android-keys/pasta-upload.jks`, alias `pasta-upload`, password in `~/.android-keys/CREDENTIALS.txt`, SHA-256 `01:95:73:31:...:9D:D2`. **Back it up.** |
| Play app signing key | SHA-256 `6B:5A:6D:5E:E3:BA:FE:0F:8E:B1:1E:57:54:ED:EF:44:4D:C5:6F:C9:50:C1:1B:F5:EF:C9:AD:18:30:65:13:43` (Console > App signing) |
| Privacy policy page | `public/privacy/index.html` (served at `/privacy/`), linked in the app footer; **deployed 2026-10-31** (Pages project `pasta`, wrangler 4.155.0 direct upload) |
| Digital Asset Links | `public/.well-known/assetlinks.json` lists the Play signing key and the upload key; **deployed 2026-10-31**, served as `application/json`, Google's Digital Asset Links check returns `linked: true` for both keys |
| App content (10 declarations) | all done: privacy URL https://pasta.sourdoughcalculator.uk/privacy/, ads No, sign-in No, content rating (IARC, email emre@enftc.co.uk: Everyone / PEGI 3), target audience 18+, Data safety (approximate + precise location: collected + shared with Open-Meteo, ephemeral, optional, app functionality; encrypted in transit; no accounts), advertising ID No, government No, financial none, health none |
| Store settings | category Food & drink, contact info@sourdoughcalculator.uk + https://pasta.sourdoughcalculator.uk |
| Default store listing | title, short + full description (plain text, "\u2022" bullets), icon, feature graphic, 7 screenshots saved; icon + feature graphic labelled as AI-generated; status "Ready to send for review" |
| Sent for review | **no** |

## Left to do

1. Install as a tester (opt in via the link above, then install from Play) and confirm the app opens full-screen with no URL bar and the location button works.
2. Send for review from Publishing overview (user's call), then closed/production.

Deploy command (from a scratch dir, after `npm run build`):
`CLOUDFLARE_API_TOKEN=$(tr -d '[:space:]' < ~/.cf-token) CLOUDFLARE_ACCOUNT_ID=f217e2d9285193b32d473c8ddb5bc5df npx wrangler@4.155.0 pages deploy <repo>/dist --project-name pasta --branch main`

## Why the asset links matter

Without `https://pasta.sourdoughcalculator.uk/.well-known/assetlinks.json` listing the signing certificate that Play installs, the TWA falls back to a browser bar instead of full-screen. Play re-signs with its own **app signing key**, so the fingerprint to add is the one Console shows under App signing (SHA-256), not the upload key. Both fingerprints are in the file (the upload key lets a locally built APK verify too).

## Data safety answers (to enter in Console)

- Location, approximate **and** precise (the wrapper holds `ACCESS_FINE_LOCATION`/`COARSE_LOCATION`; coordinates are rounded to ~0.01 degree, about 1 km, which is finer than Google's 3 km2 "approximate" threshold): collected, shared with Open-Meteo, ephemeral, optional, app functionality, encrypted in transit.
- No personal info, financial, health, messages, photos, contacts, identifiers, ads, accounts. Government app: no. Ads: no. Target audience 18+ like the sister apps.
- Policy URL: https://pasta.sourdoughcalculator.uk/privacy/

## Build

```bash
cd twa
export JAVA_HOME=~/.jdks/temurin-17                   # Bubblewrap config; JDK 25 breaks Gradle
export BUBBLEWRAP_KEYSTORE_PASSWORD=...  BUBBLEWRAP_KEY_PASSWORD=...   # same value, from CREDENTIALS.txt
npx @bubblewrap/cli@1.27.0 update --skipVersionUpgrade --manifest=twa-manifest.json   # after editing twa-manifest.json
npx @bubblewrap/cli@1.27.0 build --skipPwaValidation
bash ~/.config/play-publisher/play-upload.sh ~/.play-key.json com.sourdough.pasta \
  app-release-bundle.aab internal draft "1 (1.0.0)"
```

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
