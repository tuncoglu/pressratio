import type { Machine, Mode } from '../calc/types';
import { m, type Msg } from '../i18n';

// Seed data. Edit here to change what the app shows for each machine / die.

export const MODE_OPTIONS: { id: Mode; label: Msg; disabled?: boolean }[] = [
  { id: 'extruded', label: m('mode.extruded') },
  { id: 'alkaline', label: m('mode.alkaline') },
  { id: 'rolled', label: m('mode.rolled') },
];

export const MODE_SHORT: Record<Mode, Msg> = {
  extruded: m('mode.short.extruded'),
  alkaline: m('mode.short.alkaline'),
  rolled: m('mode.short.rolled'),
};

export const MACHINES: Record<Machine, { label: Msg; note: Msg }> = {
  manual: { label: m('machine.manual.label'), note: m('machine.manual.note') },
  electric: { label: m('machine.electric.label'), note: m('machine.electric.note') },
  roller: { label: m('machine.roller.label'), note: m('machine.roller.note') },
  pin: { label: m('machine.pin.label'), note: m('machine.pin.note') },
};

/** Generic dies for machines without a catalogue (roller). */
export const DIES = ['Spaghetti', 'Bucatini', 'Rigatoni', 'Linguine'];

/**
 * Pressing tips with sources: Reber torchio manual (warm dies, walnut-sized
 * lumps), Sirman pasta manual (liquids at room temperature).
 */
export const PRESS_TIPS: Msg[] = [m('press.tip1'), m('press.tip2'), m('press.tip3')];

export const CARE_NOTE: Msg = m('note.care');

export const LYE_NOTE: Msg = m('note.lye');

export const ALKALI_HANDLING_NOTE: Msg = m('note.alkali');
