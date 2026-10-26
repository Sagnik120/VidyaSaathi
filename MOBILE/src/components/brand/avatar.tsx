/**
 * Avatars: an uploaded photo, or one of twelve paper-cut illustrations drawn
 * from a student's world (kite, lotus, chai, owl…), or initials.
 */
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { absoluteUrl } from '@/core/api';
import { COLORS } from '@/theme/tokens';
import { Txt } from '@/components/ui/text';

export type Choice = { id: string; bg: string; fg: string; paths: string[]; circles?: Array<[number, number, number]> };

export const AVATARS: Choice[] = [
  { id: 'kite-blue', bg: '#dfeaf9', fg: '#2f528c', paths: ['M12 3 19 11 12 21 5 11Z', 'M12 3v18M5 11h14', 'M12 21c1 1.5-1 2-.5 3'] },
  { id: 'plane-sky', bg: '#f0f5fc', fg: '#3b66ae', paths: ['M3 11 21 4l-9 9-9-2Z', 'M12 13l-1 7 4-5'] },
  { id: 'lotus-rose', bg: '#fbe7e2', fg: '#b3574b', paths: ['M12 20c-5 0-8-3-8-6 3 0 6 2 8 6Zm0 0c5 0 8-3 8-6-3 0-6 2-8 6Z', 'M12 20c-2-3-2-9 0-13 2 4 2 10 0 13Z'] },
  { id: 'star-marigold', bg: '#fdf0cb', fg: '#a87410', paths: ['m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7Z'] },
  { id: 'owl-sage', bg: '#e3f0e7', fg: '#4a7a5d', paths: ['M6 8c0-3 3-4 6-4s6 1 6 4v6a6 6 0 0 1-12 0Z', 'm11 13 1 1 1-1'], circles: [[9.5, 10, 1.6], [14.5, 10, 1.6]] },
  { id: 'book-ink', bg: '#e7e3d8', fg: '#1e2942', paths: ['M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1Z', 'M12 6v13'] },
  { id: 'sun-marigold', bg: '#fff4d6', fg: '#c48c18', paths: ['M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'], circles: [[12, 12, 4]] },
  { id: 'rocket-sky', bg: '#dfeaf9', fg: '#2f528c', paths: ['M12 3c3 2 4 6 3 10l-3 2-3-2c-1-4 0-8 3-10Z', 'm9 13-2 3 3-.5M15 13l2 3-3-.5M11 18l1 3 1-3'], circles: [[12, 9, 1.4]] },
  { id: 'leaf-sage', bg: '#e3f0e7', fg: '#4a7a5d', paths: ['M5 19C5 10 11 5 20 4c0 9-5 15-14 15Z', 'M5 19 14 10'] },
  { id: 'moon-ink', bg: '#e7e3d8', fg: '#1e2942', paths: ['M19 15A8 8 0 0 1 9 5a7 7 0 1 0 10 10Z', 'M17 4v2M16 5h2'] },
  { id: 'bulb-marigold', bg: '#fdf0cb', fg: '#a87410', paths: ['M9 17h6M10 20h4', 'M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v.5h6V15c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3Z'] },
  { id: 'chai-amber', bg: '#fbf0d9', fg: '#9a6a1f', paths: ['M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z', 'M16 10h1.5a2.5 2.5 0 0 1 0 5H16', 'M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3'] },
];

export function avatarById(id?: string | null) {
  return AVATARS.find((a) => a.id === id) ?? null;
}

function Glyph({ choice, size }: { choice: Choice; size: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <G fill="none" stroke={choice.fg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {choice.paths.map((d) => <Path key={d} d={d} />)}
        {choice.circles?.map(([cx, cy, r]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
      </G>
    </Svg>
  );
}

type AvatarUser = { full_name?: string; initials?: string; avatar_url?: string | null; avatar_choice?: string | null; avatar_color?: string } | null;

export function Avatar({ user, size = 40, style }: { user: AvatarUser; size?: number; style?: StyleProp<ViewStyle> }) {
  const frame: ViewStyle = {
    width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.surface, overflow: 'hidden',
  };
  if (user?.avatar_url) {
    return (
      <View style={[frame, { backgroundColor: COLORS['paper-2'] }, style]}>
        <Image source={{ uri: absoluteUrl(user.avatar_url) }} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  const choice = avatarById(user?.avatar_choice);
  if (choice) {
    return <View style={[frame, { backgroundColor: choice.bg }, style]}><Glyph choice={choice} size={size * 0.58} /></View>;
  }
  return (
    <View style={[frame, { backgroundColor: COLORS['sky-100'] }, style]}>
      <Txt style={{ fontSize: size * 0.38, lineHeight: size * 0.5, fontWeight: '600', color: COLORS['sky-700'] }}>{user?.initials || '··'}</Txt>
    </View>
  );
}

export function AvatarGlyph({ choice, size = 56, selected }: { choice: Choice; size?: number; selected?: boolean }) {
  return (
    <View style={{ padding: 3, borderRadius: (size + 10) / 2, borderWidth: selected ? 3 : 0, borderColor: COLORS['sky-500'], margin: selected ? 0 : 3 }}>
      <View
        style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: choice.bg, alignItems: 'center', justifyContent: 'center',
          borderWidth: selected ? 0 : 1, borderColor: COLORS.line,
        }}
      >
        <Glyph choice={choice} size={size * 0.55} />
      </View>
    </View>
  );
}
