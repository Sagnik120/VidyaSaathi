/**
 * The website's type, loaded as native fonts:
 *   display  — Instrument Serif        / Tiro Devanagari Hindi
 *   sans     — Figtree                 / Noto Sans Devanagari
 *   hand     — Kalam (Latin + Devanagari)
 * A native font file carries exactly one weight, so a (family, weight, italic,
 * script) request is resolved to a concrete file here.
 */
import { Platform } from 'react-native';
// Each weight is imported from its own folder so only the files in use are bundled.
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { Kalam_300Light } from '@expo-google-fonts/kalam/300Light';
import { Kalam_400Regular } from '@expo-google-fonts/kalam/400Regular';
import { Kalam_700Bold } from '@expo-google-fonts/kalam/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_500Medium } from '@expo-google-fonts/noto-sans-devanagari/500Medium';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi/400Regular';
import { TiroDevanagariHindi_400Regular_Italic } from '@expo-google-fonts/tiro-devanagari-hindi/400Regular_Italic';

export const FONT_ASSETS = {
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold,
  InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic,
  Kalam_300Light, Kalam_400Regular, Kalam_700Bold,
  NotoSansDevanagari_400Regular, NotoSansDevanagari_500Medium, NotoSansDevanagari_600SemiBold, NotoSansDevanagari_700Bold,
  TiroDevanagariHindi_400Regular, TiroDevanagariHindi_400Regular_Italic,
};

export type FontRole = 'sans' | 'display' | 'hand';
export type FontRequest = { role: FontRole; weight: number; italic: boolean; devanagari: boolean };

const SANS_WEIGHTS: Array<[number, string]> = [[400, '400Regular'], [500, '500Medium'], [600, '600SemiBold'], [700, '700Bold']];

function nearest(weight: number): string {
  let best = SANS_WEIGHTS[0];
  for (const w of SANS_WEIGHTS) if (Math.abs(w[0] - weight) < Math.abs(best[0] - weight)) best = w;
  return best[1];
}

export function fontFamily({ role, weight, italic, devanagari }: FontRequest): string {
  if (role === 'hand') return weight >= 600 ? 'Kalam_700Bold' : weight <= 300 ? 'Kalam_300Light' : 'Kalam_400Regular';
  if (role === 'display') {
    if (devanagari) return italic ? 'TiroDevanagariHindi_400Regular_Italic' : 'TiroDevanagariHindi_400Regular';
    return italic ? 'InstrumentSerif_400Regular_Italic' : 'InstrumentSerif_400Regular';
  }
  return `${devanagari ? 'NotoSansDevanagari' : 'Figtree'}_${nearest(weight)}`;
}

const DEVANAGARI = /[ऀ-ॿ]/;
export const hasDevanagari = (text: string) => DEVANAGARI.test(text);

/**
 * Smallest comfortable line-height (× font size). Devanagari stacks marks
 * above and below the line, and a native text box clips what a browser lets
 * overflow, so tight display leading gets a little more room here.
 */
export function minLeading(role: FontRole, devanagari: boolean): number {
  if (devanagari) return role === 'display' ? 1.4 : 1.55;
  return role === 'display' ? 1.12 : role === 'hand' ? 1.3 : 1.2;
}

/** The platform's monospace face, for code and numbers that must line up. */
export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }) as string;
