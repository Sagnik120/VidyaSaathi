/** Six boxes: auto-advance, paste a whole code, backspace back, shake on error. */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, TextInput, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { COLORS, color } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { useShake } from '@/components/motion';
import { haptic } from '@/lib/haptics';

export type OtpHandle = { fill: (code: string) => void; clear: () => void; shake: () => void };

const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export const OtpInput = forwardRef<OtpHandle, { length?: number; value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean }>(
  function OtpInput({ length = 6, value, onChange, onComplete, disabled }, ref) {
    const boxes = useRef<Array<TextInput | null>>([]);
    const [focused, setFocused] = useState<number | null>(null);
    const [shakeStyle, shake] = useShake(10);
    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    const set = (next: string) => {
      const clean = next.replace(/\D/g, '').slice(0, length);
      onChange(clean);
      if (clean.length === length) onComplete?.(clean);
      return clean;
    };

    useImperativeHandle(ref, () => ({
      fill: (code) => {
        const clean = set(code);
        boxes.current[Math.min(clean.length, length - 1)]?.focus();
      },
      clear: () => {
        onChange('');
        boxes.current[0]?.focus();
      },
      shake: () => { haptic.error(); shake(); },
    }));

    // Open the keyboard on the first box once the screen has settled — unless
    // a code is already in (filled for them) or they have started elsewhere.
    const untouched = useRef(true);
    useEffect(() => { if (value) untouched.current = false; }, [value]);
    useEffect(() => {
      const id = setTimeout(() => { if (untouched.current) boxes.current[0]?.focus(); }, 350);
      return () => clearTimeout(id);
    }, []);

    return (
      <Animated.View style={[tw('flex-row justify-between gap-2'), shakeStyle]}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => { boxes.current[i] = el; }}
            testID={`otp-${i}`}
            value={d}
            editable={!disabled}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            // A whole pasted or auto-filled code arrives in one box.
            maxLength={i === 0 ? length : 1}
            selectTextOnFocus
            accessibilityLabel={`Digit ${i + 1}`}
            selectionColor={COLORS['sky-500']}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused((f) => (f === i ? null : f))}
            onChangeText={(text) => {
              const typed = text.replace(/\D/g, '');
              if (typed.length > 1) {
                const clean = set(typed);
                boxes.current[Math.min(clean.length, length - 1)]?.focus();
                return;
              }
              const arr = digits.slice();
              arr[i] = typed;
              set(arr.join(''));
              if (typed && i < length - 1) boxes.current[i + 1]?.focus();
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
            }}
            style={[
              tw('h-14 min-w-0 flex-1 rounded-2xl border text-center'),
              { fontFamily: fontFamily({ role: 'display', weight: 400, italic: false, devanagari: false }), fontSize: 30, color: COLORS.ink, paddingVertical: 0, paddingHorizontal: 0 },
              d ? { borderColor: COLORS['sky-300'], backgroundColor: color('sky-50', 0.5) } : { borderColor: COLORS['line-2'], backgroundColor: COLORS.surface },
              focused === i ? { borderColor: COLORS['sky-500'], boxShadow: `0 0 0 4px ${COLORS['sky-50']}`, transform: [{ translateY: -2 }] } : null,
              NO_OUTLINE,
            ]}
          />
        ))}
      </Animated.View>
    );
  },
);
