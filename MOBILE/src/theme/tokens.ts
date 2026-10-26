/**
 * Kaagaz — the design system, as native values. These are the same tokens the
 * website declares in FRONTEND/src/app/globals.css: a ruled school notebook,
 * fountain-pen blue, a marigold highlighter and the coral margin line.
 * Tokens are named by MEANING. Change values, not structure.
 */

export const COLORS = {
  /* paper & surfaces */
  paper: '#fbfaf6',
  'paper-2': '#f5f3ec',
  'paper-3': '#ece9df',
  surface: '#ffffff',
  rule: '#dfe8f4', // the faint blue ruled lines

  /* ink */
  ink: '#1e2942',
  'ink-2': '#4a5671',
  'ink-3': '#8691a7',

  /* lines */
  line: '#e7e3d8',
  'line-2': '#d8d3c4',

  /* primary — fountain-pen sky blue */
  'sky-50': '#f0f5fc',
  'sky-100': '#dfeaf9',
  'sky-200': '#c3d7f2',
  'sky-300': '#9cbce8',
  'sky-500': '#4c7cc7',
  'sky-600': '#3b66ae',
  'sky-700': '#2f528c',
  sky: '#3b66ae',

  /* accent — the marigold highlighter */
  'marigold-50': '#fff9e8',
  'marigold-100': '#fdf0cb',
  'marigold-200': '#f9e19a',
  'marigold-400': '#f0c35a',
  'marigold-600': '#c48c18',
  marigold: '#f0c35a',

  /* the notebook's margin line */
  margin: '#e5917f',
  'margin-100': '#fbe7e2',

  /* status — never reused as brand colour */
  sage: '#5f9474',
  'sage-100': '#e3f0e7',
  amber: '#c98f2e',
  'amber-100': '#fbf0d9',
  rose: '#c96666',
  'rose-100': '#f8e2e2',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof COLORS;

/** A token colour, optionally with alpha (0–1) — `color('ink', 0.25)`. */
export function color(name: ColorName, alpha?: number): string {
  const hex = COLORS[name];
  if (alpha === undefined || hex === 'transparent') return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* depth: paper resting / paper lifted / pressed */
export const SHADOW = {
  soft: '0 1px 0 rgba(30, 41, 66, 0.04), 0 2px 10px -4px rgba(30, 41, 66, 0.08)',
  lift: '0 2px 0 rgba(30, 41, 66, 0.03), 0 18px 40px -18px rgba(30, 41, 66, 0.25)',
  press: 'inset 0 1px 2px rgba(30, 41, 66, 0.12)',
} as const;

export const RADIUS = 14;

/** The one easing curve used everywhere (matches --ease-out-soft). */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { stiffness: 380, damping: 30, mass: 0.8 } as const;
