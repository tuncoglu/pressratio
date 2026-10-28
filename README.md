# Pasta & Noodle Dough Calculator (PressRatio)

Live at https://pasta.sourdoughcalculator.uk. Dough calculator for home pasta and Asian noodle makers — manual presses (Bigolaro-style), electric extruders and rollers. **Guidance, not guarantee.**

Offline-first, mobile-first PWA. No backend, no accounts, no analytics, no network calls at runtime. All state and batch logs live in `localStorage`; export/import as JSON.

## Run

```sh
npm install
npm run dev        # dev server (service worker is only registered in production builds)
npm test           # calculation, storage and render smoke tests
```

## Build

```sh
npm run build      # type-check + static files in dist/
npm run preview    # serve dist/ locally to try the PWA / offline mode
```

`dist/` is plain static files with relative paths, so it can be hosted in any folder of any static host. The build injects the list of built files into `dist/sw.js` so everything is cached on first visit. To check offline mode: open the preview, reload once, then go offline (DevTools → Network → Offline) and reload.

`npm run icons` regenerates the PWA icons in `public/icons/` (no dependencies).

## Layout

| Path | What |
| --- | --- |
| `src/calc/constants.ts` | **Every** model constant; placeholders are marked `PLACEHOLDER — needs user calibration` |
| `src/calc/calc.ts` | Pure calculation engine (hydration, flour, rest, squeeze test, blend, batch delta, units) |
| `src/calc/calc.test.ts`, `src/storage.test.ts` | Unit tests, including 210 g egg → 525 g flour |
| `src/components/render.test.tsx` | Server-render smoke tests for each mode and the batch log |
| `src/storage.ts` | `localStorage` persistence, JSON export / import / merge |
| `src/data/profiles.ts` | Seed data: modes, machines, dies, care and lye notes |
| `src/components/` | Calculator, squeeze-test panel, batch log |

## Calculation model

Water-fraction model, not a hardcoded multiplier. Hydration is on an *as-is* basis: water you add (egg water included) ÷ flour as weighed. Flour's own 10–15 % moisture isn't modelled, which is why the squeeze test has the final say.

```
eggWater   = wholeEgg × 0.75 + extraYolk × 0.52     (USDA: whole egg ~76 % water, yolk ~52 %)
             in-shell → shelled × 0.90; egg count × size (US large 50 g, EU M 52, L 61, XL 67)
totalWater = eggWater + addedWater

Extruded semolina + egg:
  flourTotal = totalWater / target            target = 0.30, or your calibrated target
  flourRange = [totalWater / 0.315, totalWater / 0.286]
  e.g. 210 g egg → 157.5 g water → 525 g flour (range 500–551 g)
```

**Egg precision:** under the flour total, the app shows how much of the flour figure comes from how the egg was measured. Counted eggs ±8 % (EU size classes span ±5 g), in-shell weight ±2 % (shells are 9–12 % of the egg), weighed shelled eggs ±1 g of scale resolution. Only the egg's share of the water carries this error. Counted or in-shell input offers a one-tap switch to weighed shelled eggs, prefilled with the estimate.

**Bigolaro loads:** pick your model and the app shows how many cylinder loads the dough fills, using Bottene's per-load capacity: 4° 320 g, 5° 400 g, 6° 480 g, 7° 540 g, 8° 700 g, B 480 g. "Scale to n full loads" rescales the egg, yolk and water inputs (counted eggs switch to grams) so the dough fills whole loads.

**Dies:** mod. 8 and mod. B share one die family (Ø59 × 49 mm). They list the 13 catalogue dies, marked as included or extra, with force notes from the die chart. Thin dies (spaghetti, bucatini, tagliolini, linguine) need the most force, so the app suggests the wetter half of the band for them. Smaller models list the two supplied dies plus the on-request ones. Electric machines get the full Bottene *Catalogo trafile*, filtered by model.

**Flours:** each blend slot takes a specific flour. Shipton Mill's 00 (118, 120), semolina (507) and bread flours (105, 102, 112, 101) carry protein, W, P/L and ash from Shipton's specs (via the SourDough project). The blend shows share-weighted protein and W, and blends at ≥ 13.5 % protein get a "strong blend" note. These figures inform; they don't change the hydration maths, since calibration captures their effect.

**Rolled egg pasta** (ribbons, ravioli, lasagne; by pin or pasta roller): the same water-fraction model with a wetter target, **37.5 %**, which is the classic 1 large egg (50 g shelled) per 100 g flour. Hand-rolling can't compact dough the way a machine does, so it runs wetter than Sirman's machine-kneaded sheet doughs (28–33 %), and hand recipes in the wild span 37–50 %. The band (35–42 %) is a guess until you calibrate. Rest is 30 min for plain egg dough, rising to 60 min for all-coarse-semolina dough because coarse particles hydrate slowly; a knead test replaces the squeeze test ("rest 5 minutes before adding water", because semolina feels dry at first). The result also shows how big the sheet gets: dough weight ÷ (density × thickness), with thickness per shape (ribbons ~1 mm, ravioli ~0.8 mm, lasagne 1.5 mm) and cut widths from Bottene's die catalogue.

**Ravioli filling guide** (rolled mode, ravioli shape): each ravioli is two layers of sheet, so it uses 2 × side² × thickness × density of dough. Filling scales with face area at 0.2 g/cm² (≈ 1 tsp, 5 g, for a 5 cm square), or your own weighed figure if you enter one. The guide shows how many ravioli your dough makes, the filling total, filling : dough (about 1 : 1 at 0.8 mm), and servings at 90 g (first course) or 135 g (main) per person. Cut waste isn't counted.

**Asian alkaline noodles** are a reference recipe scaled linearly from the egg weight, shown with baker's percentages: egg 35 %, baked baking soda (sodium carbonate) 1.5 %, salt 0.7 %, added water 10–17 % (starts at 10 %) — all of flour weight. The pre-bake baking-soda weight is shown (÷ 0.631). Entering lye water replaces the baked soda; the app estimates its alkali content from a placeholder and flags it **unvalidated**. With a press, the app also notes that this recipe (36–43 %) is wetter than the extrusion band.

**Rest time:** base = 20 + 10 × coarse-semolina share, rounded to 5 min; +10 below 18 °C; −5 above 26 °C; range = base … base + 10. Hold limit for raw-egg dough: 2 h, or 1 h above 32 °C (USDA).

**Squeeze test:** crumbly → ready; powdery → add water ~1 % of flour (≈ 1 tsp per 500 g), rest 5–10 min, retest; sticky → add semolina ~2 % of flour (≈ 10 g per 500 g).

**Calibration (extruded and alkaline):** each batch records the extra water and semolina added, so the app knows the **hydration reached**. Once ≥ 2 batches rated 4+ share mode, machine, liquid type (egg vs water-only) and a similar blend (≤ 20 points apart), the calculator offers their median as your target. In alkaline mode the flour is fixed by the egg, so the target sets the **added water** (your own typed amount still wins). Until you have data, the app shows the published range for alkaline noodles, 28–34 % total water (Hatcher 1999; Edwards 1996; sheeted noodles, not pressed dough), as context only.

Science review with sources: [`docs/REVIEW.md`](docs/REVIEW.md). Machine and die data: `src/data/bottene.ts`. Flour data: `src/data/flours.ts`. The corrected project brief: [`docs/BRIEF-v2.md`](docs/BRIEF-v2.md).

## Placeholders awaiting calibration

Shown in the UI with an "uncalibrated" badge wherever they affect a result.

| Constant | Current value | Why it's a placeholder |
| --- | --- | --- |
| `WATER_ONLY_HYDRATION` | 30 % (28.6–31.5 %) | Water-only extrusion hydration; copied from the egg model. Replaced automatically once you have ≥ 2 well-rated water-only batches |
| `LYE_WATER_CARBONATE_FRACTION` | 0.25 | Alkali per gram of bottled lye water; brands don't publish it |
| `ROLLED_HYDRATION` | 37.5 % (35–42 %) | Published figures span 28–50 %; replaced by your calibrated target |
| `ROLLED_REST` | 30 min, up to 60 for all-coarse semolina | Cook-blog consensus, not measured |
| `DOUGH_DENSITY` | 1.1 g/cm³ | Only converts dough weight to sheet area |
| `FILLING_G_PER_CM2` | 0.2 g/cm² | Two weak anchors (≈ 1 tsp per 4–5 cm; one recipe's 35 × 4 cm pieces ≈ 250 g); override per ravioli |
| Roll thicknesses (`src/data/rolled.ts`) | ribbons 1, ravioli 0.8, lasagne 1.5 mm | Sources disagree, especially for lasagne (0.5–1 mm) |

## Assumptions

Decisions the brief left open (simplest reasonable option chosen):

- **Hydration** = (egg water + added water) ÷ flour, as-is basis. Lye water counts in total liquid but not in hydration.
- **Alkaline mode** needs an egg weight (the recipe scales from it). If you enter added water it is used; otherwise the low end (10 % of flour) is used.
- **Blend sliders** rebalance the other flours proportionally so the total is always exactly 100 %. Presets: `100 % coarse`, `70 % 00 / 30 % coarse`, `50 / 50` (type 00 + coarse semolina).
- **Switching egg entry style** converts the current value (e.g. 210 g shelled → 233.3 g in shell) rather than reinterpreting the number. Changing egg size keeps the count.
- **Roller warning** appears only in extruded mode. Rolled egg pasta is a disabled "coming soon" option.
- **Care note** is always shown in extruded mode, and also in alkaline mode when the machine isn't a roller.
- **Squeeze-test steps** scale with batch size (~1 % water, ~2 % semolina of flour weight). That reproduces the brief's 1 tsp / 10 g at ~500 g.
- **Calibration** is on by default whenever one exists, with a visible toggle. It uses the median of batches rated 4+, needs at least 2, and applies to extruded mode only.
- **Batch delta** compares with the most recent earlier batch of the *same mode*.
- **Import** merges by batch id (imported copy wins) rather than replacing the log; unreadable entries are skipped and counted; fields missing from older exports default to 0.
- **Machine / die profiles** are seed data in `src/data/bottene.ts` and `src/data/profiles.ts` (edit the files to change them); there is no in-app editor. Die can be any free text via "Custom…".
- **Rolled mode** treats the rolling pin as the default tool and the pasta roller as an option. Switching modes swaps the machine between press/extruder and pin/roller. Rolled batches store the shape and thickness in the die field and calibrate separately from pressed ones. The 40 × 40 cm "sheet" is only a display unit for how much dough you have.
- **Bigolaro capacity** ("capacità pasta") is treated as dough mass per load. Crumbly dough is bulkier until packed, so a load may need topping up as you press.
- **"Bottoni-style"** in the original brief is read as Bottene (maker of both the Bigolaro and the Lillodue/PM electric extruders).
- **Flour identity** is stored on each batch but isn't part of the calibration key (blend similarity is). Mixing 118 and 120 in your history is unlikely to matter; switching to a very different flour will show up as a blend change only if the slot changes.
- **Batch editing** covers date, die, quantities (incl. yolks and adjustments), rest range, ambient temperature, flour blend, rating and notes. Mode and machine are fixed once a batch is started.
- Ounces are a display/input unit only; everything is stored and calculated in grams.
- Service worker is hand-written (no PWA plugin) to keep dependencies minimal; it is registered only in production builds.

## License

[MIT](LICENSE)
