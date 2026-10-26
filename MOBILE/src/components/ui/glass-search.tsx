/** Liquid-glass search box: a frosted pill with a soft sheen along its top edge. */
import { useRef, useState } from 'react';
import { Platform, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X } from 'lucide-react-native';
import { COLORS } from '@/theme/tokens';
import { fontFamily, hasDevanagari } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { Press } from './press';

const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function GlassSearch({ value, onChange, placeholder, style, autoFocus, onSubmit }: {
  value: string; onChange: (v: string) => void; placeholder: string; style?: StyleProp<ViewStyle>; autoFocus?: boolean; onSubmit?: () => void;
}) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        tw('h-14 rounded-full border'),
        {
          borderColor: 'rgba(255,255,255,0.7)',
          boxShadow: focused
            ? `0 0 0 4px ${COLORS['sky-100']}, 0 10px 30px -12px rgba(59, 102, 174, 0.45)`
            : '0 10px 30px -12px rgba(59, 102, 174, 0.35), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -8px 16px rgba(59, 102, 174, 0.06)',
        },
        style,
      ]}
    >
      <View style={[tw('absolute inset-0 overflow-hidden rounded-full'), { pointerEvents: 'none' }]}>
        <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(240,245,252,0.9)']} style={tw('flex-1')} />
        <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} style={[tw('absolute inset-x-0 top-0'), { height: 26, opacity: 0.6 }]} />
      </View>
      <View style={tw('flex-1 flex-row items-center gap-3 px-5')}>
        <Search size={20} color={COLORS['sky-600']} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          accessibilityLabel={placeholder}
          placeholderTextColor={COLORS['ink-3']}
          selectionColor={COLORS['sky-500']}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            tw('h-full flex-1'),
            { fontSize: 16, color: COLORS.ink, paddingVertical: 0, fontFamily: fontFamily({ role: 'sans', weight: 400, italic: false, devanagari: hasDevanagari(value) }) },
            NO_OUTLINE,
          ]}
        />
        {value ? (
          <Press onPress={() => { onChange(''); ref.current?.focus(); }} accessibilityLabel="clear" hitSlop={8} style={tw('h-7 w-7 items-center justify-center rounded-full bg-paper-2')}>
            <X size={14} color={COLORS['ink-3']} />
          </Press>
        ) : null}
      </View>
    </View>
  );
}
