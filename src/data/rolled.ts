// Shapes for hand-rolled dough: thickness targets and cut widths.
// Sources (agree on "about 1 mm", disagree on lasagne): Bolognese tagliatelle
// guides (a little under 1 mm, cut 6–7 mm), an Italian guide (~0.5 mm sheets),
// a stuffed-pasta rule of thumb (1 mm or thinner, since filled dough doubles
// where it folds over). Cut widths for tagliolini, fettuccine and pappardelle
// are Bottene's die widths. Thicknesses are PLACEHOLDERS — tune to your pin
// (lasagne is set to 1.5 mm at the owner's request).

import { m, type Msg } from '../i18n';

export type RollShape = 'ribbons' | 'ravioli' | 'lasagne';

export interface ShapeSpec {
  label: Msg;
  /** Short name; stored on batches in the language it was created in. */
  short: Msg;
  /** The short name for use inside a sentence. */
  shortLc: Msg;
  thicknessMm: number;
  rangeMm: [number, number];
  note: Msg;
  /** Cut names and widths; Italian pasta names, shown as they are. */
  cuts?: string[];
}

export const ROLL_SHAPES: Record<RollShape, ShapeSpec> = {
  ribbons: {
    label: m('shape.ribbons.label'),
    short: m('shape.ribbons.short'),
    shortLc: m('shape.ribbons.lc'),
    thicknessMm: 1,
    rangeMm: [0.8, 1.2],
    note: m('shape.ribbons.note'),
    cuts: ['Tagliolini 3.5 mm', 'Tagliatelle / fettuccine 6–7 mm', 'Pappardelle 14–20 mm'],
  },
  ravioli: {
    label: m('shape.ravioli.label'),
    short: m('shape.ravioli.short'),
    shortLc: m('shape.ravioli.lc'),
    thicknessMm: 0.8,
    rangeMm: [0.6, 1],
    note: m('shape.ravioli.note'),
  },
  lasagne: {
    label: m('shape.lasagne.label'),
    short: m('shape.lasagne.short'),
    shortLc: m('shape.lasagne.lc'),
    thicknessMm: 1.5,
    rangeMm: [1, 2],
    note: m('shape.lasagne.note'),
  },
};

export const ROLL_TIPS: Msg[] = [m('roll.tip1'), m('roll.tip2'), m('roll.tip3')];
