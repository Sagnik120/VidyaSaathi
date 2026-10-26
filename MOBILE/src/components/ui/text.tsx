/**
 * Every piece of text in the app. It does what the browser does for the
 * website's font stacks: picks the Latin or the Devanagari face by what the
 * text actually contains, maps weight/italic to the right font file, and keeps
 * the website's defaults (16px sans, ink, 1.5 leading). Nested <Txt> inherits.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { COLORS } from '@/theme/tokens';
import { fontFamily, hasDevanagari, minLeading, type FontRole } from '@/theme/fonts';

type Inherited = { role: FontRole; weight: number; italic: boolean; devanagari: boolean; size: number };
const TextContext = createContext<Inherited | null>(null);

const ROLES: readonly string[] = ['sans', 'display', 'hand'];

/** The characters written directly in this element (children handle their own). */
function ownText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(ownText).join('');
  return '';
}

function toWeight(w: TextStyle['fontWeight']): number {
  if (w === 'bold') return 700;
  if (w === 'normal' || w === undefined) return 400;
  return Number(w) || 400;
}

export function Txt({ style, children, ...rest }: TextProps) {
  const parent = useContext(TextContext);
  const { fontFamily: family, fontWeight, fontStyle, ...own } = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  const role = (family && ROLES.includes(family) ? family : parent?.role ?? 'sans') as FontRole;
  const weight = fontWeight !== undefined ? toWeight(fontWeight) : parent?.weight ?? 400;
  const italic = fontStyle !== undefined ? fontStyle === 'italic' : parent?.italic ?? false;
  const text = ownText(children);
  const devanagari = text ? hasDevanagari(text) : parent?.devanagari ?? false;
  const size = typeof own.fontSize === 'number' ? own.fontSize : parent?.size ?? 16;

  const resolved: TextStyle = own;
  if (family && !ROLES.includes(family)) {
    resolved.fontFamily = family; // a real font name was asked for: leave it alone
    if (fontWeight !== undefined) resolved.fontWeight = fontWeight;
    if (fontStyle !== undefined) resolved.fontStyle = fontStyle;
  } else if (!parent || role !== parent.role || weight !== parent.weight || italic !== parent.italic || devanagari !== parent.devanagari) {
    resolved.fontFamily = fontFamily({ role, weight, italic, devanagari });
  }

  const floor = Math.ceil(size * minLeading(role, devanagari));
  if (!parent) {
    resolved.color ??= COLORS.ink;
    resolved.fontSize ??= size;
    resolved.lineHeight = Math.max(typeof own.lineHeight === 'number' ? own.lineHeight : size * 1.5, floor);
  } else if (typeof own.lineHeight === 'number') {
    resolved.lineHeight = Math.max(own.lineHeight, floor);
  }
  // Tracking splits Devanagari conjuncts.
  if (devanagari && resolved.letterSpacing) resolved.letterSpacing = 0;

  return (
    <TextContext.Provider value={{ role, weight, italic, devanagari, size }}>
      <Text maxFontSizeMultiplier={1.2} {...rest} style={resolved}>{children}</Text>
    </TextContext.Provider>
  );
}
