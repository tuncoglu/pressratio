// Bottene machine and die data.
// Sources: Bottene "Bigolaro" leaflet (technical data table), Bottene
// "Catalogo trafile" (Nov 2024), and the Bigolaro 8/B die chart compiled from it.

// ---- Bigolaro (manual press) -------------------------------------------

export type BigolaroModel = '4' | '5' | '6' | '7' | '8' | 'B';

/** Dough per load ("capacità pasta") and machine mass, from the leaflet. */
export const BIGOLARO_MODELS: Record<BigolaroModel, { label: string; capacityG: number; massKg: number }> = {
  '4': { label: 'mod. 4°', capacityG: 320, massKg: 3.7 },
  '5': { label: 'mod. 5°', capacityG: 400, massKg: 4.1 },
  '6': { label: 'mod. 6°', capacityG: 480, massKg: 4.7 },
  '7': { label: 'mod. 7°', capacityG: 540, massKg: 5.6 },
  '8': { label: 'mod. 8°', capacityG: 700, massKg: 6.3 },
  B: { label: 'mod. B', capacityG: 480, massKg: 5.0 },
};

/** How hard a die is to push dough through by hand (from the 8/B die chart). */
export type DieForce = 'high' | 'medium' | 'low';

export interface Die {
  /** Stable id; the Bottene catalogue code where there is one. */
  id: string;
  name: string;
  dims: string;
  code?: string;
  /** Bigolaro: supplied with the machine (choose two) vs extra. */
  included?: boolean;
  force?: DieForce;
  /** Electric: made to special order. */
  special?: boolean;
  /** Electric: PTFE (Teflon) insert rather than bronze. */
  ptfe?: boolean;
  /** Electric: models this die is not made for. */
  notOn?: ElectricModel[];
  /** Electric: size differs by model. */
  sizeNote?: string;
}

/**
 * mod. 8 and mod. B share one die family (Ø59 × 49 mm). The chart notes that
 * thin dies need the most force and large short shapes the least.
 */
export const BIGOLARO_8B_DIES: Die[] = [
  { id: '8', code: '8', name: 'Spaghetti', dims: 'Ø2.5 mm', included: true, force: 'high' },
  { id: '10', code: '10', name: 'Bigoli', dims: 'Ø3.0 mm', included: true, force: 'medium' },
  { id: '36', code: '36', name: 'Rigatoni / gargati', dims: 'Ø7.5 mm, ridged', included: true, force: 'medium' },
  { id: '18', code: '18', name: 'Tagliolini', dims: '3.5 × 1.2 mm', included: true, force: 'high' },
  { id: '20', code: '20', name: 'Fettuccine', dims: '7 × 0.8 mm', included: true, force: 'medium' },
  { id: '14', code: '14', name: 'Bucatini', dims: 'Ø3.7 mm', force: 'high' },
  { id: '12', code: '12', name: 'Linguine', dims: '2.4 × 1.5 mm', force: 'high' },
  { id: '16', code: '16', name: 'Chitarra', dims: '2 × 2 mm', force: 'medium' },
  { id: '49', code: '49', name: 'Fusilli 3P', dims: '10 mm', force: 'medium' },
  { id: '50', code: '50', name: 'Caserecce', dims: '8.8 mm', force: 'medium' },
  { id: '37', code: '37', name: 'Rigatoni', dims: 'Ø10.5 mm, ridged', force: 'medium' },
  { id: '38', code: '38', name: 'Rigatoni', dims: 'Ø14 mm, ridged', force: 'low' },
  { id: 'paccheri', name: 'Paccheri', dims: 'Ø25 mm, wall 1.4 mm', force: 'low' },
];

/** Smaller Bigolaro models: the leaflet lists the two supplied dies and two on request; sizes not given. */
export const BIGOLARO_SMALL_DIES: Die[] = [
  { id: 'bigoli', name: 'Bigoli (spaghetti)', dims: '', included: true },
  { id: 'gargati', name: 'Gargati (rigatoni)', dims: '', included: true },
  { id: 'tagliolini', name: 'Tagliolini', dims: '', special: true },
  { id: 'tagliatelle', name: 'Tagliatelle', dims: '', special: true },
];

export function bigolaroDies(model: BigolaroModel | null): Die[] {
  return model === '8' || model === 'B' ? BIGOLARO_8B_DIES : BIGOLARO_SMALL_DIES;
}

// ---- Electric extruders (Bottene catalogue) ----------------------------

export type ElectricModel = 'lillodue' | 'pm35' | 'inver7' | 'pm96' | 'pm120';

export const ELECTRIC_MODELS: Record<ElectricModel, string> = {
  lillodue: 'Lillodue',
  pm35: 'PM35',
  inver7: 'Inver7 / PM50 / PM80',
  pm96: 'PM96',
  pm120: 'PM120',
};

const NOT_LILLO: ElectricModel[] = ['lillodue'];

export const ELECTRIC_DIES: Die[] = [
  // Pasta lunga
  { id: '1', code: '1', name: 'Spaghetti', dims: 'Ø0.8 mm' },
  { id: '2', code: '2', name: 'Spaghetti', dims: 'Ø1 mm' },
  { id: '3', code: '3', name: 'Spaghetti', dims: 'Ø1.25 mm' },
  { id: '4', code: '4', name: 'Spaghetti', dims: 'Ø1.5 mm' },
  { id: '5', code: '5', name: 'Spaghetti', dims: 'Ø1.75 mm' },
  { id: '6', code: '6', name: 'Spaghetti', dims: 'Ø2 mm' },
  { id: '7', code: '7', name: 'Spaghetti', dims: 'Ø2.25 mm' },
  { id: '8', code: '8', name: 'Spaghetti', dims: 'Ø2.5 mm' },
  { id: '9', code: '9', name: 'Spaghetti', dims: 'Ø2.75 mm' },
  { id: '10', code: '10', name: 'Spaghetti', dims: 'Ø3 mm' },
  { id: '101', code: '101', name: 'Pici', dims: 'Ø3.5 mm' },
  { id: '102', code: '102', name: 'Pici', dims: 'Ø4 mm' },
  { id: '11', code: '11', name: 'Linguine', dims: '2 × 1.2 mm' },
  { id: '12', code: '12', name: 'Linguine', dims: '2.4 × 1.5 mm' },
  { id: '13', code: '13', name: 'Linguine', dims: '2.8 × 1.6 mm' },
  { id: '14', code: '14', name: 'Bucatini', dims: 'Ø3.7 mm' },
  { id: '15', code: '15', name: 'Bucatini', dims: 'Ø4.5 mm' },
  { id: '16', code: '16', name: 'Chitarra', dims: '2 × 2 mm' },
  { id: '160', code: '160', name: 'Chitarra', dims: '2.5 × 2.5 mm' },
  { id: '17', code: '17', name: 'Tagliolini', dims: '1.8 × 0.8 mm' },
  { id: '18', code: '18', name: 'Tagliolini', dims: '3.5 × 1.2 mm' },
  { id: '19', code: '19', name: 'Tagliatelle', dims: '5 × 0.8 mm' },
  { id: '20', code: '20', name: 'Tagliatelle', dims: '7 × 0.8 mm' },
  { id: '21', code: '21', name: 'Tagliatelle', dims: '9.5 × 0.8 mm' },
  { id: '22', code: '22', name: 'Pappardelle', dims: '14 × 0.8 mm' },
  { id: '23', code: '23', name: 'Pappardelle', dims: '17 × 0.8 mm' },
  { id: '24', code: '24', name: 'Pappardelle', dims: '20 × 0.8 mm' },
  { id: '25', code: '25', name: 'Reginette / mafalde', dims: '11 × 0.8 mm' },
  { id: '26', code: '26', name: 'Reginette / mafalde', dims: '15 × 0.8 mm', notOn: NOT_LILLO },
  { id: '27', code: '27', name: 'Reginette / mafalde', dims: '19 × 0.8 mm', notOn: NOT_LILLO },
  { id: '51', code: '51', name: 'Tripoline', dims: '12 × 1.05 mm' },
  { id: '52', code: '52', name: 'Scialatiello', dims: '5 × 2 mm', special: true },
  // Pasta corta
  { id: '30', code: '30', name: 'Maccheroni lisci', dims: 'Ø7.5 mm' },
  { id: '31', code: '31', name: 'Maccheroni lisci', dims: 'Ø10.5 mm' },
  { id: '32', code: '32', name: 'Maccheroni lisci', dims: 'Ø14 mm' },
  { id: '33', code: '33', name: 'Maccheroni lisci', dims: 'Ø20 mm' },
  { id: '34', code: '34', name: 'Cannellone', dims: 'Ø30/35 mm', notOn: NOT_LILLO, sizeNote: '30 mm on PM35, 35 mm on larger models' },
  { id: '35', code: '35', name: 'Maccheroni rigati', dims: 'Ø4.5 mm' },
  { id: '36', code: '36', name: 'Maccheroni rigati', dims: 'Ø7.5 mm' },
  { id: '37', code: '37', name: 'Maccheroni rigati', dims: 'Ø10.5 mm' },
  { id: '38', code: '38', name: 'Maccheroni rigati', dims: 'Ø14 mm' },
  { id: '39', code: '39', name: 'Maccheroni rigati', dims: 'Ø20 mm' },
  { id: '40', code: '40', name: 'Maccheroni rigati', dims: 'Ø30/35 mm', notOn: NOT_LILLO, sizeNote: '30 mm on PM35, 35 mm on larger models' },
  { id: 'gargato', name: 'Gargato veneto', dims: 'Ø8 mm, wall 1.5 mm', special: true },
  { id: 'paccheri', name: 'Paccheri', dims: 'Ø25 mm, wall 1.4 mm' },
  { id: '117R', code: '117R', name: 'Penne rigate', dims: 'Ø8.8 mm', special: true, notOn: ['lillodue', 'pm35'] },
  { id: '200', code: '200', name: 'Celentani / amori', dims: 'Ø7.8 mm', ptfe: true },
  { id: '123', code: '123', name: 'Curvi lisci', dims: 'Ø7.8 mm' },
  { id: '132', code: '132', name: 'Curvi rigati', dims: 'Ø8.6 mm' },
  { id: '139', code: '139', name: 'Creste lisce', dims: 'Ø7.8 mm' },
  { id: '144', code: '144', name: 'Creste rigate', dims: 'Ø8.6 mm' },
  { id: '267', code: '267', name: 'Torchietti', dims: 'Ø8.3 mm' },
  { id: '90', code: '90', name: 'Gramigna', dims: 'Ø2.5 mm' },
  { id: '91', code: '91', name: 'Gramigna', dims: 'Ø3 mm' },
  { id: '41', code: '41', name: 'Conchiglia', dims: '37 mm', notOn: NOT_LILLO },
  { id: '42', code: '42', name: 'Gnocchi', dims: '27 mm', notOn: NOT_LILLO },
  { id: '43', code: '43', name: 'Gnocchi sardi', dims: '16/19 mm', sizeNote: '16 mm on Lillodue, 19 mm on others' },
  { id: '44', code: '44', name: 'Orecchiette', dims: '18 mm', notOn: NOT_LILLO },
  { id: '45', code: '45', name: 'Canestri lisci', dims: '15 mm', notOn: NOT_LILLO },
  { id: '46', code: '46', name: 'Canestri rigati', dims: '16 mm', notOn: NOT_LILLO },
  { id: '47', code: '47', name: 'Ruote', dims: '16.5/25.4 mm', sizeNote: '25.4 mm on PM96/PM120' },
  { id: '49', code: '49', name: 'Fusilli 3P', dims: '10 mm' },
  { id: '232', code: '232', name: 'Fusilli 2P', dims: '12.6 mm' },
  { id: '366', code: '366', name: 'Fusillone 3P', dims: '15/20 mm', special: true, sizeNote: '20 mm on PM96/PM120' },
  { id: '50', code: '50', name: 'Caserecce', dims: '8.8 mm' },
  { id: '215', code: '215', name: 'Trecce', dims: '8.8 mm' },
  { id: 'radiatori', name: 'Radiatori', dims: '17.5/25 mm', sizeNote: '25 mm on PM96/PM120' },
  { id: 'campanelle', name: 'Campanelle', dims: '11.4 mm' },
  { id: 'trottole', name: 'Trottole', dims: '10.4 mm' },
  { id: 'fiori', name: 'Fiori', dims: '', notOn: NOT_LILLO },
  { id: 'riso', name: 'Riso medio', dims: '8.5 mm' },
  { id: 'grattata', name: 'Grattata', dims: '~3.8–4 mm' },
];

export function electricDies(model: ElectricModel | null): Die[] {
  return model ? ELECTRIC_DIES.filter((d) => !d.notOn?.includes(model)) : ELECTRIC_DIES;
}

export function dieLabel(d: Die): string {
  const code = d.code ? `N°${d.code} ` : '';
  const dims = d.dims ? ` ${d.dims}` : '';
  const flags = [d.included ? 'included' : '', d.special ? 'special order' : '', d.ptfe ? 'PTFE' : '']
    .filter(Boolean)
    .join(', ');
  return `${code}${d.name}${dims}${flags ? ` (${flags})` : ''}`;
}
