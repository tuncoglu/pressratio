Copy everything between the lines below into your coding agent.

---

# PROJECT BRIEF v2: "PressRatio" — extrusion dough calculator for hobby cooks

> v2 changes from v1 are marked **[v2]**. Rationale and sources: `docs/REVIEW.md`.

## 1. Goal
Build an offline-first, mobile-first web app that calculates flour/liquid ratios, rest times and texture checkpoints for home pasta and Asian noodle making. It focuses on **extruded** dough: manual presses like the Bottene Bigolaro, electric extruders, and pasta rollers.

The app is **guidance, not guarantee**. Its job is to get the user to the correct *texture state*, then **[v2] learn the user's own target hydration from their rated batches** and feed it back into the calculator.

## 2. Core user & insight
Primary user: a home cook with a manual Bigolaro press on a wooden horse, using coarse semolina, type 00 flour, eggs, water, and sometimes food-grade lye water (kansui) for alkaline noodles. **[v2] The user may be outside the US: egg sizes and units must not assume US conventions.**

Key insight: **"1 egg per 100 g flour" is wrong for extrusion.** Extruder dough is drier and crumbly, about 30 % water by flour weight. That matches industry (25–30 kg water per 100 kg semolina; ~31 % moisture at the die). The press compacts crumbs; it does not add water. "Slightly crumbly is fine; powdery is not."

**[v2] Hydration basis:** every hydration figure is *as-is*: water added (egg water included) ÷ flour as weighed. Flour's own 10–15 % moisture is not modelled, because it varies by about as much as the target band. That is why the squeeze test has the final say. Say this in the UI.

## 3. Tech constraints
- Static single-page app. **No backend, no accounts, no analytics, no network calls at runtime.**
- React + Vite + TypeScript. PWA manifest + service worker that precaches the built files so the app works offline after the first visit.
- Persist state and batch logs in `localStorage`; export/import as JSON. Import must validate and tolerate older exports (missing fields → defaults).
- Unit toggle: grams / ounces, default grams. Store and calculate in grams.
- All calculations deterministic, pure, and unit-tested.

## 4. MVP scope — 3 screens

### Screen 1: Calculator
Inputs:
- **Mode**: `Extruded semolina + egg` | `Asian alkaline noodles (00 + semolina)` | `Rolled egg pasta (coming soon — disabled)`
- **Liquid**: shelled egg weight *or* number of eggs **[v2] + egg size (US large ≈ 50 g, EU M ≈ 52 g, EU L ≈ 61 g, EU XL ≈ 67 g shelled)** *or* in-shell weight; **[v2] optional extra yolks (g)**; optional added water; optional lye water (alkaline only)
- **Flour blend**: `type 00`, `fine semolina`, `coarse semolina`, `bread flour`, always summing to 100 % (sliders rebalance the others). Presets: `100 % coarse semolina`, `70 % 00 / 30 % coarse`, `50/50`.
- **Machine**: `Manual press (Bigolaro-style)` | `Electric extruder (Bottene Lillodue / PM)` | `Roller`
- **[v2] Bigolaro model** (4°, 5°, 6°, 7°, 8°, B; per-load dough capacity 320/400/480/540/700/480 g) or **electric model** (Lillodue, PM35, Inver7/PM50/PM80, PM96, PM120)
- **Die**: **[v2]** from Bottene's catalogue: the 13-die 8/B family (included vs extra, force class) for the Bigolaro, or the *Catalogo trafile* filtered by electric model; plus custom text
- **[v2] Flour per blend slot**: Shipton Mill 00 (118, 120), semolina (507), bread (105, 102, 112, 101) with protein, W, P/L and ash; or "other"
- **Ambient temperature** (°C, optional, default 20)

Outputs:
- Flour total and range, per-flour breakdown (named by product)
- **[v2] Press loads:** dough mass ÷ model capacity, with "scale to n full loads"
- **[v2] Blend protein / W** (share-weighted) and a strong-blend note at ≥ 13.5 % protein
- **[v2] Die guidance:** thin dies on a manual press → aim for the wetter half of the band
- **[v2] Egg precision line:** the flour error caused by the egg input (counted ±8 %, in-shell ±2 %, weighed shelled = ±1 g scale resolution), and what weighing would cut it to. Counted or in-shell input gets a one-tap "I weighed them (shelled)" switch that prefills the estimate and focuses the field. Shelled weight is the default input.
- Total liquid and hydration % (labelled as-is basis)
- Texture target line: "Damp sand — should clump when squeezed, not form a smooth ball"
- Rest range and the rest/hold rules from §6
- **[v2]** When a personal calibration exists (§5.4): a visible toggle "Use my calibrated target (x %, from n batches)"
- Expandable "Adjust" panel with the squeeze test
- "Start batch" → creates a batch log entry

### Screen 2: Squeeze-test decision tree (inline)
User taps one of three states and gets the next action. **[v2] Step sizes scale with batch size** (§5.3):
- **Slightly crumbly, clumps in hand** → "Ready. Load the press."
- **Dry and powdery, won't clump** → "Add water ≈ 1 % of flour (≈ 1 tsp per 500 g flour) at a time, mix, rest 5–10 min, retest." Suggest a spray bottle.
- **Smooth sticky ball** → "Too wet for extrusion. Add semolina ≈ 2 % of flour (≈ 10 g per 500 g) at a time."
- **[v2]** With a batch in progress, one-tap buttons log each water or semolina step to it.

### Screen 3: Batch log & calibration
- List: date, mode, machine, die, blend, liquid (egg, yolks, water, lye), rest, **[v2] extra water *and* extra semolina added**, **[v2] hydration reached**, rating (1–5), notes.
- Every field editable. Delta vs the previous batch of the same mode, e.g. "You added 8 g extra water (last time: 0 g) and rated this batch 4/5 vs 2/5 last time. Hydration reached: 31.5 % (last time: 30 %)."
- Export/import JSON.

## 5. Calculation engine — implement exactly

### 5.1 Water-fraction model
```
eggWater   = wholeEgg_g × 0.75 + yolk_g × 0.52     // USDA: whole egg ~76 % water, yolk ~52 %
totalWater = eggWater + addedWater

Extruded semolina + egg:
  target = 0.30, band = [0.286, 0.315]            // or the user's calibrated target, same band width
  flourTotal = totalWater / target
  flourRange = [totalWater / 0.315, totalWater / 0.286]
```
- In-shell: `egg_g = inShell_g × 0.90`; show both numbers.
- Egg count: `count × size.shelledG`. Default size US large (50 g); always show grams and prompt the user to weigh.
- Test: **210 g shelled egg → 525 g flour (range 500–551 g).**
- **[v2]** Test: 4.2 counted eggs (210 g) → ±42 g flour from the egg input; weighed → ±2.5 g.
- If yolks are entered, note that yolk fat softens the dough beyond its water content.

### 5.2 Asian alkaline noodles
Reference recipe scaled linearly from total egg, shown as baker's percentages:
- 70 % type 00 / 30 % coarse semolina; egg 35 %; added water 10–17 % (start low); salt 0.7 %; baked baking soda (sodium carbonate) 1.5 % (top of the commercial 1.0–1.5 % kansui range).
- **[v2]** Show the pre-bake baking-soda weight: `bakedSoda / 0.631` (2 NaHCO₃ → Na₂CO₃ + H₂O + CO₂).
- **[v2]** This recipe is 36–43 % hydration, above the extrusion band. When paired with a press, say so, show the added water that would give 30 %, and mark the alkaline extrusion hydration as uncalibrated. Do not change the recipe.
- **[v2] Lye water (corrected):** let the user enter lye water in grams; it replaces the baked soda. **Do not claim lye water is stronger than baked soda.** A common substitute is 1 tsp lye water ≈ ¼ tsp baked soda in 1 tsp water, so dry baked soda carries ~4× the alkali per spoon. Warn against spoon-for-spoon swaps in either direction. Estimate alkali as `lye_g × LYE_WATER_CARBONATE_FRACTION` (placeholder 0.25, brand-dependent) and mark the conversion **unvalidated**.

### 5.3 [v2] Corrective step sizes
```
waterStep_g    = max(1, flour_g × 0.01)    // ≈ +1 hydration point, ≈ 1 tsp at 500 g
semolinaStep_g = max(2, flour_g × 0.02)    // ≈ 10 g at 500 g
```
Show the teaspoon equivalent (1 tsp ≈ 5 g, nearest quarter).

### 5.4 [v2] Calibration
```
hydrationReached = (eggWater + addedWater + extraWater) / (flour + extraSemolina)
```
For the current mode + machine + liquid type (egg vs water-only) + similar blend (≤ 20 percentage points moved), take batches rated ≥ 4. If there are ≥ 2, offer their **median** hydration reached as the personal target (toggle, default on). Extruded mode only. A calibration supersedes the water-only placeholder.

### 5.5 Constants
Every numeric constant lives in `constants.ts`, each with a source comment: given by this brief, derived (with source), or `// PLACEHOLDER — needs user calibration`. Placeholders get an "uncalibrated" badge in the UI. Current placeholders: water-only extrusion hydration (30 %), lye-water alkali fraction (0.25).

## 6. Rest-time logic
```
coarseShare = coarse semolina % / 100
base = round5(20 + 10 × coarseShare)       // [v2] continuous: 0 % → 20, 100 % → 30, no threshold
if ambientTemp < 18 °C: base += 10
if ambientTemp > 26 °C: base -= 5
range = [base, base + 10]
```
Rules to display, with the reason in one clause each:
- Rest **covered, at room temperature** (covering prevents drying; chilling slows the hydration the rest is for). Never refrigerate a short rest.
- Coarse semolina hydrates slowly (larger particles take longer to wet through). If still powdery after the rest, use the squeeze-test water step.
- **[v2] Hold limit (raw egg, USDA):** 2 h total unrefrigerated, **1 h above 32 °C**, counted from cracking the eggs. Beyond that, refrigerate covered and temper 20–30 min before pressing.
- Never load cold dough into a manual press (cold dough is stiffer and much harder to push through the die).

## 7. Machine & die profiles (seed data)
- **Manual press (Bigolaro-style):** needs the driest dough; firm resistance expected; bronze chamber and die.
- **Electric extruder (Bottoni-style):** a bit more forgiving, still crumbly input.
- **Roller:** not for extruded dough. Warn if selected in extruded mode and point to the rolled mode.

Care note, always visible in extruded mode **[v2] and in alkaline mode unless the machine is a roller**:
> "Bronze dies and chambers are copper alloys. Clean immediately after use, before dough dries in the die. Hand-wash only and dry completely. Never use the dishwasher: alkaline dishwasher detergent tarnishes copper alloys and attacks aluminium. Alkaline (lye) dough left on bronze can discolour or etch it."

## 8. Copy & safety requirements
- Header tagline: **"Guidance, not guarantee."**
- Lye water: food-grade lye water is a carbonate solution, **not** industrial sodium hydroxide; it is still strongly alkaline (roughly pH 12–13) and can burn eyes and skin; use small quantities; keep away from children; store sealed.
- **[v2]** Baked soda: more caustic than baking soda; use dry tools; keep off wet skin and out of eyes; dissolve in the recipe water.
- **[v2]** Alkaline dough and lye water corrode aluminium: no aluminium bowls, dies or press parts.
- Never claim a recipe is "foolproof" or "guaranteed".

## 9. Non-goals
No backend, auth, cloud sync, analytics, scraping, AI features, nutrition data, shopping or social features. No rolled-pasta mode in v1 (shown disabled).

## 10. Definition of done
- Runs locally, builds to static files, installs as a PWA, works offline after the first visit **(verify in a real browser, offline)**.
- Tests cover: 210 g → 525 g; all three squeeze states; step scaling; continuous rest; hold limit at 32 °C; egg sizes; yolks; lye estimate; calibration (median, blend matching, minimum count); export/import round-trip with older data.
- In-shell → shelled shows both numbers.
- A batch can be created, adjusted (water/semolina logged), edited, rated, exported and imported.
- Every placeholder is isolated in `constants.ts` and badged in the UI.
- README: run, build, calculation model, placeholders, assumptions. `docs/REVIEW.md`: sources for every derived constant.

## 11. Working instructions
- Build the calculation module **first**, with tests, before any UI.
- Kitchen-phone UI: large tap targets (≥ 44 px), high contrast, light and dark, no hover-only interactions, inputs ≥ 16 px (no iOS zoom).
- Prefer boring, dependency-light solutions.
- If a decision is ambiguous, pick the simplest reasonable option, implement it, and record it under "Assumptions" in the README. Do not stop to ask.
- **[v2]** Any new numeric constant needs a source or a PLACEHOLDER marker. No unsourced magic numbers, including safety thresholds.
- Deliver a working vertical slice: Calculator → Batch → Adjust → Rate → Calibrated target → Export.
