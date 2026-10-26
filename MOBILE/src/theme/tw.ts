/**
 * `tw("flex-row items-center gap-3 rounded-2xl bg-sky-50 px-4")` → a native style.
 *
 * The website is styled with Tailwind classes; this turns the same class names
 * into React Native styles, using the same tokens, so a screen here can be laid
 * out with the exact spacing, radii, type sizes and colours of its web twin.
 * It covers the subset this app uses — an unknown class warns in development.
 * Results are cached and frozen: treat them as read-only.
 */
import type { TextStyle, ViewStyle } from 'react-native';
import { COLORS, SHADOW, type ColorName } from './tokens';

export type TwStyle = ViewStyle & TextStyle;
type Bag = Record<string, unknown>;

const REM = 16;

const STATIC: Record<string, Bag> = {
  flex: { display: 'flex' },
  hidden: { display: 'none' },
  'flex-row': { flexDirection: 'row' },
  'flex-col': { flexDirection: 'column' },
  'flex-row-reverse': { flexDirection: 'row-reverse' },
  'flex-wrap': { flexWrap: 'wrap' },
  'flex-nowrap': { flexWrap: 'nowrap' },
  'flex-1': { flex: 1 },
  'flex-none': { flexGrow: 0, flexShrink: 0 },
  grow: { flexGrow: 1 },
  'grow-0': { flexGrow: 0 },
  shrink: { flexShrink: 1 },
  'shrink-0': { flexShrink: 0 },
  'items-start': { alignItems: 'flex-start' },
  'items-center': { alignItems: 'center' },
  'items-end': { alignItems: 'flex-end' },
  'items-baseline': { alignItems: 'baseline' },
  'items-stretch': { alignItems: 'stretch' },
  'justify-start': { justifyContent: 'flex-start' },
  'justify-center': { justifyContent: 'center' },
  'justify-end': { justifyContent: 'flex-end' },
  'justify-between': { justifyContent: 'space-between' },
  'justify-around': { justifyContent: 'space-around' },
  'justify-evenly': { justifyContent: 'space-evenly' },
  'self-start': { alignSelf: 'flex-start' },
  'self-center': { alignSelf: 'center' },
  'self-end': { alignSelf: 'flex-end' },
  'self-stretch': { alignSelf: 'stretch' },
  'self-auto': { alignSelf: 'auto' },
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },
  'overflow-hidden': { overflow: 'hidden' },
  'overflow-visible': { overflow: 'visible' },
  uppercase: { textTransform: 'uppercase' },
  lowercase: { textTransform: 'lowercase' },
  capitalize: { textTransform: 'capitalize' },
  underline: { textDecorationLine: 'underline' },
  'line-through': { textDecorationLine: 'line-through' },
  'no-underline': { textDecorationLine: 'none' },
  italic: { fontStyle: 'italic' },
  'not-italic': { fontStyle: 'normal' },
  'text-left': { textAlign: 'left' },
  'text-center': { textAlign: 'center' },
  'text-right': { textAlign: 'right' },
  'border-dashed': { borderStyle: 'dashed' },
  'border-dotted': { borderStyle: 'dotted' },
  'border-solid': { borderStyle: 'solid' },
  'font-normal': { fontWeight: '400' },
  'font-light': { fontWeight: '300' },
  'font-medium': { fontWeight: '500' },
  'font-semibold': { fontWeight: '600' },
  'font-bold': { fontWeight: '700' },
  // Logical families: <Txt> resolves them to a real font for the language.
  'font-sans': { fontFamily: 'sans' },
  'font-display': { fontFamily: 'display' },
  'font-hand': { fontFamily: 'hand' },
  'tabular-nums': { fontVariant: ['tabular-nums'] },
  'pointer-events-none': { pointerEvents: 'none' },
  'pointer-events-auto': { pointerEvents: 'auto' },
  'aspect-video': { aspectRatio: 16 / 9 },
  'aspect-square': { aspectRatio: 1 },
  'shadow-soft': { boxShadow: SHADOW.soft },
  'shadow-lift': { boxShadow: SHADOW.lift },
  'shadow-press': { boxShadow: SHADOW.press },
  'shadow-none': { boxShadow: 'none' },
  'rounded-full': { borderRadius: 9999 },
  'rounded-none': { borderRadius: 0 },
};

const TEXT_SIZES: Record<string, [number, number]> = {
  xs: [12, 16], sm: [14, 20], base: [16, 24], lg: [18, 28], xl: [20, 28], '2xl': [24, 32],
  '3xl': [30, 36], '4xl': [36, 40], '5xl': [48, 48], '6xl': [60, 60], '7xl': [72, 72],
};
const RADII: Record<string, number> = { xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32 };
const MAX_W: Record<string, number> = { xs: 320, sm: 384, md: 448, lg: 512, xl: 576, '2xl': 672, '3xl': 768, '4xl': 896, '6xl': 1152 };
const LEADING: Record<string, number> = { none: 1, tight: 1.25, snug: 1.375, normal: 1.5, relaxed: 1.625, loose: 2 };
const TRACKING: Record<string, number> = { tighter: -0.05, tight: -0.025, normal: 0, wide: 0.025, wider: 0.05, widest: 0.1 };

/** Class prefix → the style properties it sets (longest prefix wins). */
const LENGTHS: Array<[string, string[]]> = ([
  ['p', ['padding']], ['px', ['paddingHorizontal']], ['py', ['paddingVertical']],
  ['pt', ['paddingTop']], ['pr', ['paddingRight']], ['pb', ['paddingBottom']], ['pl', ['paddingLeft']],
  ['m', ['margin']], ['mx', ['marginHorizontal']], ['my', ['marginVertical']],
  ['mt', ['marginTop']], ['mr', ['marginRight']], ['mb', ['marginBottom']], ['ml', ['marginLeft']],
  ['gap', ['gap']], ['gap-x', ['columnGap']], ['gap-y', ['rowGap']],
  ['w', ['width']], ['h', ['height']], ['size', ['width', 'height']],
  ['min-w', ['minWidth']], ['min-h', ['minHeight']], ['max-w', ['maxWidth']], ['max-h', ['maxHeight']],
  ['top', ['top']], ['right', ['right']], ['bottom', ['bottom']], ['left', ['left']],
  ['inset', ['top', 'right', 'bottom', 'left']], ['inset-x', ['left', 'right']], ['inset-y', ['top', 'bottom']],
  ['basis', ['flexBasis']],
] as Array<[string, string[]]>).sort((a, b) => b[0].length - a[0].length);

const CORNERS: Record<string, string[]> = {
  t: ['borderTopLeftRadius', 'borderTopRightRadius'], b: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
  l: ['borderTopLeftRadius', 'borderBottomLeftRadius'], r: ['borderTopRightRadius', 'borderBottomRightRadius'],
  tl: ['borderTopLeftRadius'], tr: ['borderTopRightRadius'], bl: ['borderBottomLeftRadius'], br: ['borderBottomRightRadius'],
};
const SIDES: Record<string, string[]> = {
  t: ['borderTopWidth'], r: ['borderRightWidth'], b: ['borderBottomWidth'], l: ['borderLeftWidth'],
  x: ['borderLeftWidth', 'borderRightWidth'], y: ['borderTopWidth', 'borderBottomWidth'],
};

/** "[12px]" | "[0.68rem]" | "[40%]" | "[1.05]" → a number or percentage. */
function arbitrary(raw: string): number | string | undefined {
  if (raw.endsWith('rem')) return parseFloat(raw) * REM;
  if (raw.endsWith('px')) return parseFloat(raw);
  if (raw.endsWith('%')) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function length(value: string, prefix: string): number | string | undefined {
  if (value === 'px') return 1;
  if (value === 'full') return '100%';
  if (value === 'auto') return 'auto';
  if (value.startsWith('[') && value.endsWith(']')) return arbitrary(value.slice(1, -1));
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * 4;
  const fraction = /^(\d+)\/(\d+)$/.exec(value);
  if (fraction) return `${(Number(fraction[1]) / Number(fraction[2])) * 100}%`;
  if (prefix === 'max-w' && value in MAX_W) return MAX_W[value];
  return undefined;
}

function negate(v: number | string): number | string {
  return typeof v === 'number' ? -v : v.startsWith('-') ? v.slice(1) : `-${v}`;
}

/** "sky-600" | "sky-600/40" | "[#2a3a5c]" → a colour string. */
function colour(raw: string): string | undefined {
  const [name, alpha] = raw.split('/');
  let hex: string | undefined;
  if (name.startsWith('[') && name.endsWith(']')) hex = name.slice(1, -1);
  else if (name in COLORS) hex = COLORS[name as ColorName];
  if (!hex) return undefined;
  if (alpha === undefined) return hex;
  const a = alpha.startsWith('[') ? Number(alpha.slice(1, -1)) : Number(alpha) / 100;
  if (!hex.startsWith('#') || !Number.isFinite(a)) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

type Pending = { leading?: number; tracking?: number; transform: Array<Record<string, unknown>> };

function apply(o: Bag, pending: Pending, cls: string): boolean {
  const fixed = STATIC[cls];
  if (fixed) { Object.assign(o, fixed); return true; }

  const negative = cls.startsWith('-');
  const c = negative ? cls.slice(1) : cls;

  /* auto margins */
  const auto = /^(m[xytrbl]?)-auto$/.exec(c);
  if (auto) {
    const props = LENGTHS.find(([p]) => p === auto[1])![1];
    props.forEach((p) => { o[p] = 'auto'; });
    return true;
  }

  /* colours and text sizes */
  if (c.startsWith('bg-')) { const v = colour(c.slice(3)); if (v) { o.backgroundColor = v; return true; } }
  if (c.startsWith('text-')) {
    const rest = c.slice(5);
    if (rest in TEXT_SIZES) { o.fontSize = TEXT_SIZES[rest][0]; o.lineHeight = TEXT_SIZES[rest][1]; return true; }
    if (/^\[[\d.]+(rem|px)?\]$/.test(rest)) { o.fontSize = arbitrary(rest.slice(1, -1)); return true; }
    const v = colour(rest);
    if (v) { o.color = v; return true; }
  }

  /* borders */
  if (c === 'border') { o.borderWidth = 1; return true; }
  if (c.startsWith('border-')) {
    const rest = c.slice(7);
    if (/^\d+$/.test(rest)) { o.borderWidth = Number(rest); return true; }
    const side = /^([trblxy])(?:-(\d+))?$/.exec(rest);
    if (side) { SIDES[side[1]].forEach((p) => { o[p] = side[2] ? Number(side[2]) : 1; }); return true; }
    const v = colour(rest);
    if (v) { o.borderColor = v; return true; }
  }

  /* radii */
  if (c === 'rounded') { o.borderRadius = 4; return true; }
  if (c.startsWith('rounded-')) {
    const parts = c.slice(8).split('-');
    const corner = parts.length > 1 && parts[0] in CORNERS ? parts.shift()! : parts.length === 1 && parts[0] in CORNERS ? parts.shift()! : null;
    const token = parts.join('-');
    const r = token === '' ? 4 : token === 'full' ? 9999 : token === 'none' ? 0 : token in RADII ? RADII[token]
      : token.startsWith('[') ? (arbitrary(token.slice(1, -1)) as number | undefined) : undefined;
    if (r !== undefined) {
      if (corner) CORNERS[corner].forEach((p) => { o[p] = r; });
      else o.borderRadius = r;
      return true;
    }
  }

  /* type */
  if (c.startsWith('leading-')) {
    const rest = c.slice(8);
    if (rest in LEADING) { pending.leading = LEADING[rest]; return true; }
    if (/^\d+(\.\d+)?$/.test(rest)) { o.lineHeight = Number(rest) * 4; pending.leading = undefined; return true; }
    if (rest.startsWith('[')) {
      const inner = rest.slice(1, -1);
      if (inner.endsWith('px') || inner.endsWith('rem')) { o.lineHeight = arbitrary(inner); pending.leading = undefined; }
      else pending.leading = Number(inner);
      return true;
    }
  }
  if (c.startsWith('tracking-')) {
    const rest = c.slice(9);
    const em = rest in TRACKING ? TRACKING[rest] : rest.startsWith('[') ? parseFloat(rest.slice(1)) : NaN;
    if (Number.isFinite(em)) { pending.tracking = negative ? -em : em; return true; }
  }

  /* numbers */
  const simple = /^(opacity|z|flex|grow|shrink|rotate|scale|translate-x|translate-y|aspect)-(.+)$/.exec(c);
  if (simple) {
    const [, key, raw] = simple;
    const inner = raw.startsWith('[') ? raw.slice(1, -1) : raw;
    if (key === 'aspect') {
      const ratio = /^([\d.]+)\/([\d.]+)$/.exec(inner);
      if (ratio) { o.aspectRatio = Number(ratio[1]) / Number(ratio[2]); return true; }
    }
    if (key === 'rotate') {
      const deg = parseFloat(inner);
      if (Number.isFinite(deg)) { pending.transform.push({ rotate: `${negative ? -deg : deg}deg` }); return true; }
    }
    if (key === 'translate-x' || key === 'translate-y') {
      const v = length(raw, key);
      if (v !== undefined && v !== 'auto') { pending.transform.push({ [key === 'translate-x' ? 'translateX' : 'translateY']: negative ? negate(v) : v }); return true; }
    }
    const n = Number(inner);
    if (Number.isFinite(n)) {
      if (key === 'opacity') { o.opacity = raw.startsWith('[') ? n : n / 100; return true; }
      if (key === 'z') { o.zIndex = negative ? -n : n; return true; }
      if (key === 'flex') { o.flex = n; return true; }
      if (key === 'grow') { o.flexGrow = n; return true; }
      if (key === 'shrink') { o.flexShrink = n; return true; }
      if (key === 'scale') { pending.transform.push({ scale: raw.startsWith('[') ? n : n / 100 }); return true; }
    }
  }

  /* spacing, sizing, position */
  for (const [prefix, props] of LENGTHS) {
    if (!c.startsWith(`${prefix}-`)) continue;
    const v = length(c.slice(prefix.length + 1), prefix);
    if (v === undefined) break;
    props.forEach((p) => { o[p] = negative ? negate(v) : v; });
    return true;
  }
  return false;
}

const cache = new Map<string, TwStyle>();
const warned = new Set<string>();

export function tw(classes: string): TwStyle {
  const hit = cache.get(classes);
  if (hit) return hit;

  const o: Bag = {};
  const pending: Pending = { transform: [] };
  for (const cls of classes.split(/\s+/)) {
    if (!cls) continue;
    if (!apply(o, pending, cls) && __DEV__ && !warned.has(cls)) {
      warned.add(cls);
      console.warn(`tw: unsupported class "${cls}"`);
    }
  }

  const size = typeof o.fontSize === 'number' ? o.fontSize : REM;
  if (pending.leading !== undefined) o.lineHeight = Math.round(size * pending.leading * 100) / 100;
  if (pending.tracking !== undefined) o.letterSpacing = Math.round(size * pending.tracking * 100) / 100;
  if (pending.transform.length) o.transform = Object.freeze(pending.transform);
  const hasBorder = Object.keys(o).some((k) => k.startsWith('border') && k.endsWith('Width'));
  if (hasBorder && o.borderColor === undefined) o.borderColor = COLORS.line;

  const style = Object.freeze(o) as TwStyle;
  cache.set(classes, style);
  return style;
}
