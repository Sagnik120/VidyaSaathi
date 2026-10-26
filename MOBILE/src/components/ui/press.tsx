/**
 * The base touchable. The website's hover and active states become a press
 * state here: the element dips slightly while a finger is on it, and
 * `activeStyle` supplies the colours the web shows on hover.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { router, type Href } from 'expo-router';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** merged in while pressed (the web's hover colours) */
  activeStyle?: StyleProp<ViewStyle>;
  /** how far it dips while pressed; 1 = not at all */
  scaleTo?: number;
  /** navigate here on press */
  href?: Href;
  /** replace the current screen instead of pushing */
  replace?: boolean;
  children?: ReactNode | ((pressed: boolean) => ReactNode);
};

export function Press({ style, activeStyle, scaleTo = 0.97, href, replace, children, onPress, onPressIn, onPressOut, disabled, ...rest }: PressProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = (e: GestureResponderEvent) => {
    onPress?.(e);
    if (!href) return;
    if (replace) router.replace(href);
    else router.push(href);
  };

  return (
    <AnimatedPressable
      accessibilityRole={href ? 'link' : 'button'}
      {...rest}
      disabled={disabled}
      onPress={press}
      onPressIn={(e) => {
        setPressed(true);
        if (scaleTo !== 1) scale.set(withTiming(scaleTo, { duration: 110 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        if (scaleTo !== 1) scale.set(withSpring(1, { stiffness: 400, damping: 22 }));
        onPressOut?.(e);
      }}
      style={[style, pressed && activeStyle, animated]}
    >
      {typeof children === 'function' ? children(pressed) : children}
    </AnimatedPressable>
  );
}
