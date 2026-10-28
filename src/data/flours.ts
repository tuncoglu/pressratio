import type { FlourKey } from '../calc/types';

// Flours you can pick for each blend slot. Shipton Mill figures come from the
// SourDough project's catalogue (protein = midpoint of Shipton's spec range,
// rounded to 0.5 %; W, P/L and ash from Shipton's technical data). Fields
// Shipton doesn't publish are left out rather than guessed.

export interface FlourSpec {
  id: string;
  /** Which blend slot it fills. */
  role: FlourKey;
  label: string;
  /** Shipton product number. */
  product?: string;
  protein?: number;
  /** Alveograph strength. */
  w?: number;
  /** Alveograph tenacity / extensibility ratio. */
  pl?: number;
  ash?: string;
  note?: string;
}

export const FLOURS: FlourSpec[] = [
  // Type 00
  {
    id: 'shipton-118',
    role: 'type00',
    label: 'Shipton Italian Type 00 (118)',
    product: '118',
    protein: 13.5,
    w: 340,
    pl: 1.0,
    ash: '0.45–0.50 %',
    note: 'Very fine, low ash, strong.',
  },
  {
    id: 'shipton-120',
    role: 'type00',
    label: 'Shipton Pizza & Pasta Type 00 Organic (120)',
    product: '120',
    protein: 13.5,
    w: 320,
    pl: 0.8,
    ash: '0.45–0.55 %',
    note: 'Organic; slightly more extensible (lower P/L) than 118.',
  },
  { id: 'generic-00', role: 'type00', label: 'Other type 00' },

  // Coarse semolina
  {
    id: 'shipton-507',
    role: 'coarseSemolina',
    label: 'Shipton Organic Semolina (507)',
    product: '507',
    protein: 12.5,
    note: 'Durum semolina grit. Shipton does not publish W or particle size.',
  },
  { id: 'generic-coarse', role: 'coarseSemolina', label: 'Other coarse semolina' },

  // Fine semolina (semola rimacinata)
  {
    id: 'generic-fine',
    role: 'fineSemolina',
    label: 'Fine semolina (semola rimacinata)',
    note: 'Shipton does not list a re-milled durum flour.',
  },

  // Bread flour
  {
    id: 'shipton-105',
    role: 'breadFlour',
    label: 'Shipton No. 4 Organic White (105)',
    product: '105',
    protein: 12.0,
    w: 275,
    pl: 1.0,
  },
  {
    id: 'shipton-102',
    role: 'breadFlour',
    label: 'Shipton French Type 55 (102)',
    product: '102',
    protein: 12.5,
    w: 260,
    pl: 0.9,
    ash: '0.50–0.55 %',
  },
  {
    id: 'shipton-112',
    role: 'breadFlour',
    label: 'Shipton Canadian Strong White (112)',
    product: '112',
    protein: 14.5,
    ash: '0.56–0.60 %',
    note: 'Spec range 14.1–15.3 % protein.',
  },
  {
    id: 'shipton-101',
    role: 'breadFlour',
    label: 'Shipton Finest Bakers White No. 1 (101)',
    product: '101',
    protein: 11.5,
  },
  { id: 'generic-bread', role: 'breadFlour', label: 'Other bread flour' },
];

export type FlourChoice = Record<FlourKey, string>;

export const DEFAULT_FLOUR_CHOICE: FlourChoice = {
  type00: 'shipton-118',
  fineSemolina: 'generic-fine',
  coarseSemolina: 'shipton-507',
  breadFlour: 'shipton-105',
};

export function floursFor(role: FlourKey): FlourSpec[] {
  return FLOURS.filter((f) => f.role === role);
}

export function flourById(id: string | undefined): FlourSpec | undefined {
  return FLOURS.find((f) => f.id === id);
}
