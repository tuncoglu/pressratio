import type { Machine, Mode } from '../calc/types';

// Seed data. Edit here to change what the app shows for each machine / die.

export const MODE_OPTIONS: { id: Mode; label: string; disabled?: boolean }[] = [
  { id: 'extruded', label: 'Extruded semolina + egg' },
  { id: 'alkaline', label: 'Asian alkaline noodles (00 + semolina)' },
  { id: 'rolled', label: 'Rolled egg pasta (ribbons, ravioli, lasagne)' },
];

export const MODE_SHORT: Record<Mode, string> = {
  extruded: 'Extruded',
  alkaline: 'Alkaline noodles',
  rolled: 'Rolled',
};

export const MACHINES: Record<Machine, { label: string; note: string }> = {
  manual: {
    label: 'Manual press (Bigolaro-style)',
    note: 'Needs the driest dough. Expect firm resistance when pressing. Bronze chamber and die.',
  },
  electric: {
    label: 'Electric extruder (Bottene Lillodue / PM)',
    note: 'Slightly more forgiving than a manual press, but still wants crumbly input.',
  },
  roller: {
    label: 'Pasta roller',
    note: 'Not for extruded dough. Use it for rolled pasta.',
  },
  pin: {
    label: 'Rolling pin',
    note: 'A long, completely flat pin gives the most even sheets. Hand-rolling cannot compact dough, so it needs more water than a machine.',
  },
};

/** Generic dies for machines without a catalogue (roller). */
export const DIES = ['Spaghetti', 'Bucatini', 'Rigatoni', 'Linguine'];

/**
 * Pressing tips with sources: Reber torchio manual (warm dies, walnut-sized
 * lumps), Sirman pasta manual (liquids at room temperature).
 */
export const PRESS_TIPS = [
  'Warm the die in warm water before pressing: cold dies give irregular pasta (Reber torchio manual).',
  'Use eggs and water at room temperature, never straight from the fridge (Sirman).',
  'Load the press with walnut-sized crumbs and pack them down as you go (Reber).',
];

export const CARE_NOTE =
  'Bronze dies and chambers are copper alloys. Clean immediately after use, before dough dries in the die: a soak in warm water loosens it. Hand-wash only and dry completely. Never use the dishwasher: alkaline dishwasher detergent tarnishes copper alloys and attacks aluminium. Alkaline (lye) dough left on bronze can discolour or etch it.';

export const LYE_NOTE =
  'Food-grade lye water (kansui) is a carbonate solution, NOT the same as industrial sodium hydroxide. It is still strongly alkaline (roughly pH 12–13) and can burn eyes and skin: use small quantities, keep it away from children, and store it sealed.';

export const ALKALI_HANDLING_NOTE =
  'Baked baking soda (sodium carbonate) is more caustic than baking soda: use dry tools, keep it off wet skin and out of eyes. To make it, bake baking soda (about 1 hour at 120–150 °C); it loses about 37 % of its weight, so 1 g of baked soda needs ~1.6 g of baking soda. Dissolve it in the recipe water for even mixing. Alkaline dough and lye water corrode aluminium: use stainless, glass or plastic bowls, and keep them away from aluminium dies and press parts.';
