// Shapes for hand-rolled dough: thickness targets and cut widths.
// Sources (agree on "about 1 mm", disagree on lasagne): Bolognese tagliatelle
// guides (a little under 1 mm, cut 6–7 mm), an Italian guide (~0.5 mm sheets),
// a stuffed-pasta rule of thumb (1 mm or thinner, since filled dough doubles
// where it folds over). Cut widths for tagliolini, fettuccine and pappardelle
// are Bottene's die widths. Thicknesses are PLACEHOLDERS — tune to your pin.

export type RollShape = 'ribbons' | 'ravioli' | 'lasagne';

export interface ShapeSpec {
  label: string;
  /** Short name stored on batches. */
  short: string;
  thicknessMm: number;
  rangeMm: [number, number];
  note: string;
  cuts?: string[];
}

export const ROLL_SHAPES: Record<RollShape, ShapeSpec> = {
  ribbons: {
    label: 'Ribbons (tagliatelle, fettuccine, pappardelle)',
    short: 'Ribbons',
    thicknessMm: 1,
    rangeMm: [0.8, 1.2],
    note: 'Bolognese tagliatelle are rolled a little under 1 mm. Thicker ribbons (up to ~2 mm) suit a hearty sauce.',
    cuts: ['Tagliolini 3.5 mm', 'Tagliatelle / fettuccine 6–7 mm', 'Pappardelle 14–20 mm'],
  },
  ravioli: {
    label: 'Ravioli (filled)',
    short: 'Ravioli',
    thicknessMm: 0.8,
    rangeMm: [0.6, 1],
    note: 'Roll to 1 mm or thinner: the dough doubles where it folds over the filling, so thick sheets cook gummy at the seam.',
  },
  lasagne: {
    label: 'Lasagne sheets',
    short: 'Lasagne',
    thicknessMm: 1,
    rangeMm: [0.5, 1.5],
    note: 'Sources disagree (about 0.5 to 1 mm). Thinner layers cook faster; a bit thicker holds up better in a bake.',
  },
};

export const ROLL_TIPS = [
  'Wrap the dough while it rests and keep the piece you are not rolling covered: it dries into a crust quickly (Sirman).',
  'Roll from the centre outwards, turning the sheet a quarter turn often; a long, completely flat pin and a flat board give the most even sheet (Michelin Guide).',
  'Dust with semolina rather than flour so the sheet does not absorb extra water.',
];
