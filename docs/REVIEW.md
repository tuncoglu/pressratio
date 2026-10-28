# Adversarial review — PressRatio v0.1

Review of both the original brief and my first implementation, checked against published food-science, regulatory and chemistry sources. Each finding gives what was wrong, why (with evidence), and what changed. Severity reflects how much a wrong value would hurt a user's batch or safety.

## Verdict on the core model

The core idea holds up. The ~30 % as-is hydration for extruded egg dough fits industrial practice. Commercial lines add roughly 25–30 kg of water per 100 kg of semolina, and pasta leaves the die at ~31 % total moisture [1][2]. A home recipe for torchio-pressed bigoli (200 g durum + 50 g flour, 50 g egg, 45 g water, 25 g oil) works out to ~33 % water plus oil [3]. The water-fraction model, a squeeze test as the final authority, and the batch log are the right architecture.

The problems were in the edges: one backwards safety/chemistry claim, two silent ~20 % errors, steps that ignore batch size, and a calibration loop that didn't exist.

## Findings

### 1. Lye-water strength claim was backwards — HIGH (brief)
**Was:** the brief said to warn that "lye water is far stronger than baked soda".
**Evidence:** bottled lye water is a solution of potassium/sodium carbonates in water [4][5]. The usual home substitute is **1 tsp lye water ≈ ¼ tsp baked soda dissolved in 1 tsp water** [6]. So a spoon of dry baked soda carries roughly 4× the alkali of a spoon of lye water. Lye water *is* hazardous, but because it is a ready-made, strongly alkaline liquid (reported around pH 12–13) that splashes [6]. It is not more alkali per spoon.
**Fix:** the warning now says not to swap spoon-for-spoon *in either direction* and gives the common substitution. It also estimates the user's alkali dose from a new placeholder (`LYE_WATER_CARBONATE_FRACTION = 0.25`, flagged uncalibrated because brands don't publish concentration [4]). Safety copy keeps "not industrial sodium hydroxide", "keep from children", "store sealed".

### 2. "Large egg = 50 g" is US-only — HIGH (brief)
**Was:** egg count × 50 g.
**Evidence:** US Large is a 24 oz/dozen minimum (~57 g in shell, ~50 g shelled). EU classes are M 53–63 g, L 63–73 g and XL ≥ 73 g in shell [7]. An EU "L" egg is ~61 g shelled, so 4 "large" eggs are underestimated by ~22 %, and so is the flour.
**Fix:** an egg-size selector (US large / EU M / L / XL), derived from regulation midpoints × 0.90 yield. The app still tells users to weigh.

### 3. Fixed correction steps ignore batch size — MEDIUM (brief)
**Was:** "add water 1 tsp", "add semolina 10 g", always.
**Evidence (arithmetic):** hydration change = Δwater ÷ flour. On the ~500 g reference batch, 5 g is +1 point, a third of the 28.6–31.5 % band. On a 200 g batch, 1 tsp is +2.5 points, nearly the whole band, so users overshoot and bounce between "powdery" and "sticky".
**Fix:** steps are ~1 % (water) and ~2 % (semolina) of flour weight. That reproduces the brief's 1 tsp / 10 g at its reference size and scales elsewhere. Teaspoon equivalents are shown, and there's a spray-bottle tip for even wetting.

### 4. No calibration loop — HIGH (my implementation)
**Was:** the brief's goal is to "calibrate from their own batch history". v0.1 only displayed deltas and never fed anything back. Semolina added for sticky dough wasn't logged at all, so the hydration actually reached was unknowable.
**Fix:** batches log extra water *and* extra semolina, and the app computes **hydration reached** = (egg water + added + extra water) ÷ (flour + extra semolina). Once ≥ 2 batches rated 4+ share mode, machine, liquid type (egg vs water-only) and a similar flour blend (≤ 20 points apart), the calculator offers their **median** as "your target", with a toggle. Medians resist one odd batch. Blends are matched because flours absorb different amounts of water, so a target learned on 100 % semolina shouldn't drive a 70 % 00 blend. A calibration also clears the water-only placeholder badge.

### 5. Rest-time cliff at an invented threshold — MEDIUM (brief + my implementation)
**Was:** 30 min if "coarse-semolina-dominant", else 20. I invented a 50 % threshold (flagged as a placeholder), so 49 % coarse rested 10 min less than 50 %.
**Evidence:** water uptake by semolina is diffusion-limited and slower for larger particles. Fine particles and damaged starch absorb faster, and mixed granulations hydrate unevenly [8][9][10]. Particle size is a continuum, not a switch.
**Fix:** base rest interpolates linearly from 20 min (0 % coarse) to 30 min (100 % coarse), rounded to 5 min. The brief's endpoints are unchanged, and the placeholder is gone. Temperature adjustments are kept (sorption kinetics are temperature-dependent [8]).

### 6. Hold time ignored hot kitchens — MEDIUM (brief)
**Was:** "refrigerate if holding longer than 2 hours".
**Evidence:** USDA FSIS: perishables should spend at most 2 h in the danger zone, **1 h above 90 °F (32 °C)**, and the time is cumulative [11].
**Fix:** the hold note switches to 1 h above 32 °C and says the clock starts when the eggs are cracked.

### 7. Yolks treated as whole egg — MEDIUM (model gap)
**Evidence:** USDA composition is ~76 % water for whole egg [12] versus ~52 % for yolk. Yolk-enriched extruded doughs are common. Entering yolks as "egg" overstates water by ~45 % for that portion, so the app asks for too much flour.
**Fix:** an optional "extra yolks" field at 0.52, with a note that yolk fat also softens the dough beyond what the water count suggests.

### 8. Alkaline reference recipe is wetter than the extrusion band — MEDIUM (brief inconsistency)
**Evidence (arithmetic from the brief's own numbers):** egg at 35 % of flour × 0.75 = 26.25 % water, plus 10–17 % added = **36–43 % hydration**, well above the 28.6–31.5 % band the brief calls right for extrusion. Fine for rolled or cut noodles; unproven for a manual press.
**Fix:** an info notice when alkaline mode is paired with a press. It shows the added water that would hit 30 % (≈ 3.75 % of flour) and says that how alkali shifts the right extrusion hydration is uncalibrated. The recipe itself is unchanged. The 1.5 % carbonate dose sits at the top of commercial kansui guidance of 1.0–1.5 % [13].

### 9. Baked soda: conversion and handling missing — LOW–MEDIUM
**Evidence:** 2 NaHCO₃ → Na₂CO₃ + H₂O + CO₂, so baked soda keeps 106/168 = 63 % of its weight. Sodium carbonate is more caustic than bicarbonate: use dry tools, keep it off skin and out of eyes [13][14].
**Fix:** each recipe shows the pre-bake baking-soda weight, with a handling note and "dissolve it in the recipe water".

### 10. Aluminium not mentioned — MEDIUM (safety/equipment)
**Evidence:** alkaline solutions strip aluminium's protective oxide and corrode it. Dishwasher makers warn against caustic detergents on aluminium, and copper alloys tarnish in alkaline detergent [15].
**Fix:** the care note now explains *why* no dishwasher (alkaline detergent). Alkaline mode warns against aluminium bowls, dies and press parts. "Pit the surface" became "discolour or etch": bronze is fairly corrosion-resistant, and pitting was an overstatement.

### 11. "As-is" hydration basis was implicit — LOW (honesty)
**Evidence:** semolina carries 10–15 % moisture of its own [2]. Variation of a few points shifts true dough moisture by about as much as the whole target band.
**Fix:** the result card says hydration is "water you add ÷ flour as weighed", and that this is why the squeeze test has the final say. Model and precision are unchanged.

## Addendum: evidence from your own files

Cross-checked against `~/Projects/pasta_research`, `~/Projects/pasta-dies`, the two Bottene PDFs you uploaded, and the SourDough flour catalogue:

- **The 30 % target is confirmed again.** Bresciani, Pagani & Marti 2022 (*Foods* 11:256): industry doses 25–29 g water per 100 g semolina for 30–32 % total moisture. EP 0350552: ~30 % moisture keeps paste viscosity, and so extrusion pressure, manageable; semolina carries 13–15 % moisture of its own. The Reber torchio manual: 2.0 kg flour to 0.75 kg egg + water, i.e. 28.1 % hydration if all egg.
- **Coarse semolina really does hydrate slowly.** Bresciani 2022: particles above 400 µm give "low hydration kinetics with inadequate moistening". Semolina spans 150–550 µm (Sicignano thesis). This supports the continuous rest model.
- **Thin dies need wetter dough.** Your 8/B die chart says thin dies need the most force, and EP 0350552 says lower moisture raises extrusion pressure. Added as die-specific guidance, without changing the numbers.
- **Yolk claim corrected.** v0.2 said yolk fat makes dough "feel wetter". Sirman's yolk-only tajarin (2.5 kg flour, 1.5 kg yolks, 0.09 kg water) runs at ~35 % water, which points the other way. The note now just says the effect is uncalibrated.
- **New tips:** warm dies before pressing; cold dies give irregular pasta (Reber). Liquids at room temperature (Sirman). Walnut-sized crumbs (Reber).
- **Bronze vs PTFE** (Bresciani 2022): bronze gives a rough, porous surface; PTFE gives a smooth, glossy one. Shown for the PTFE celentani die.
- **Shipton's 00s are strong** (W 320–340, 13.5 % protein). A 00-heavy blend triggers the strong-blend note. Semolina-heavy blends (507, 12.5 %) don't.

## Addendum: calibrating alkaline-dough hydration

Published alkaline-noodle studies test **28–34 % total water** ([Hatcher et al. 1999](https://www.cerealsgrains.org/publications/cc/1999/July/Pages/76_4_566.aspx), [Edwards et al. 1996](https://www.cerealsgrains.org/publications/cc/backissues/1996/Documents/CC1996a144.html)); Edwards found those levels below the farinograph optimum. A [KU Leuven thesis](https://lirias.kuleuven.be/retrieve/286277) summarises kansui as raising water absorption. These are sheeted noodles, so nothing published fits a hand press. The app therefore shows the range as context and calibrates the actual pressing hydration from your rated batches (median of 4+ rated batches, same mode, machine, liquid type and similar blend), which sets the added water in alkaline mode.

## Kept as-is, with reasons
- **0.75 egg water and 0.90 in-shell yield.** Within published ranges (USDA ~76 %; shell ~9–12 %, falling with egg size [16]). Precision beyond this is swamped by flour moisture.
- **The 28.6–31.5 % band.** Consistent with the industrial and recipe evidence above. Users personalise it through calibration rather than through new constants.
- **Rolled mode disabled, no backend, no analytics.** Out of scope per the brief.

## Remaining placeholders
| Constant | Value | How to retire it |
| --- | --- | --- |
| `WATER_ONLY_HYDRATION` | 30 % | Log ≥ 2 well-rated water-only batches; calibration replaces it automatically |
| `LYE_WATER_CARBONATE_FRACTION` | 0.25 | Brand-specific; needs a label value or titration |

## Not verified
- I couldn't drive the UI in a browser in this session (the Chrome extension wasn't connected). UI behaviour is covered by server-render smoke tests, not click-through.
- The Koon Chun lye water ratio is unpublished [4]. The pH figures come from forum measurements [6].

## Sources
1. [Pasta processing — Wikipedia](https://en.wikipedia.org/wiki/Pasta_processing)
2. Pasta extrusion patents: [US5789035](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5789035), [US5462758](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5462758), [US5139806](https://patents.google.com/patent/US5139806)
3. [Gambero Rosso — bigoli recipe](https://www.gamberorosso.it/notizie/pasta-fatta-in-casa-con-i-consigli-degli-esperti-la-ricetta-dei-bigoli//)
4. [ChefSteps forum — Koon Chun kansui](https://community.chefsteps.com/discussion/2343/koon-chun-kansui); [Alkaline noodles — Wikipedia](https://en.wikipedia.org/wiki/Alkaline_noodles)
5. [Omnivore's Cookbook — kansui](https://omnivorescookbook.com/kansui/)
6. [Eat Little Bird — what is lye water](https://eatlittlebird.com/lye-water/); [The Fresh Loaf — alkali for noodles](https://www.thefreshloaf.com/node/29845/alkali-making-noodles#comment-226478)
7. [EU Reg. 589/2008 Art. 4 — egg weight grades](https://www.legislation.gov.uk/eur/2008/589/article/4/data.html)
8. [Hébrard et al. 2003, Powder Technology — semolina hydration vs particle size and temperature](https://hal.archives-ouvertes.fr/hal-01593341/file/2003-Hebrard-PowderTechnol-HAL.pdf)
9. [Water sorption by semolina size fractions — HAL](https://hal.archives-ouvertes.fr/hal-01273456)
10. [World Grain — the complexities of durum milling](https://world-grain.com/articles/10208-the-complexities-of-durum-milling)
11. [USDA FSIS — keep clear of the danger zone](https://www.fsis.usda.gov/news-events/news-press-releases/usda-urges-consumers-keep-clear-danger-zone-summer)
12. USDA FoodData Central 171287 (egg, whole, raw), via [getfoodfacts](https://getfoodfacts.com/food/egg-whole-raw-fresh-171287)
13. [Kioko — Niwakyu kansui dosage](https://shop.kioko.fr/en/products/niwakyu-mongol-one-kansui); [Biting at the Bits — baked baking soda](https://bitingatthebits.com/how-to-make-baked-baking-soda-for-alkaline-noodles-and-homemade-recipe/)
14. [Food Republic — kansui for ramen](https://www.foodrepublic.com/1294496/make-or-break-ingredient-need-sturdy-ramen-noodles)
15. [Miele dishwasher manual — items not suitable](https://www.manualslib.com/manual/2743977/Miele-G-7200.html?page=39); [Whirlpool manual — aluminium darkening](https://manualsonline.com/manuals/mfg/whirlpool/du9500xr.html?p=12)
16. [Eggshell percentage vs egg weight — Univ. of Milan](https://air.unimi.it/handle/2434/8116)
