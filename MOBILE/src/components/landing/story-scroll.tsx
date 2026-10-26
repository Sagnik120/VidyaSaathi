/**
 * Scroll plumbing for the welcome story. The page publishes how far it has
 * scrolled; each <StorySection> knows where it sits, tells its children when
 * it has come into view (so their reveals play then, as on the website), and
 * offers a 0 → 1 progress value for effects that follow the finger.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useAnimatedReaction, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { InViewProvider } from '@/components/motion';

type Story = { scrollY: SharedValue<number>; viewport: SharedValue<number> };
type Place = { y: SharedValue<number>; height: SharedValue<number> };

const StoryContext = createContext<Story | null>(null);
const PlaceContext = createContext<Place | null>(null);

export const StoryProvider = StoryContext.Provider;

function useStory(): Story {
  const story = useContext(StoryContext);
  if (!story) throw new Error('Story sections must be inside the welcome page');
  return story;
}

/**
 * A band of the story. Sections may nest (a card inside a chapter), as long as
 * the inner one is a direct child of the outer one — each adds its own offset
 * to its parent's to know where it sits on the page.
 */
export function StorySection({ children, style, onPlace }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPlace?: (y: number, height: number) => void }) {
  const { scrollY, viewport } = useStory();
  const parent = useContext(PlaceContext);
  const offset = useSharedValue(Number.MAX_SAFE_INTEGER);
  const height = useSharedValue(0);
  const y = useDerivedValue(() => (parent ? parent.y.value : 0) + offset.value);
  const [inView, setInView] = useState(false);

  // In view once its top edge is a little way up the screen; it stays revealed.
  useAnimatedReaction(
    () => scrollY.value + viewport.value * 0.88 > y.value,
    (now, before) => { if (now && !before) scheduleOnRN(setInView, true); },
  );

  return (
    <View
      style={style}
      onLayout={(e) => {
        offset.set(e.nativeEvent.layout.y);
        height.set(e.nativeEvent.layout.height);
        onPlace?.(e.nativeEvent.layout.y, e.nativeEvent.layout.height);
      }}
    >
      <PlaceContext.Provider value={{ y, height }}>
        <InViewProvider value={inView}>{children}</InViewProvider>
      </PlaceContext.Provider>
    </View>
  );
}

/**
 * How far the surrounding section has travelled through the screen: 0 when its
 * top edge reaches `start` of the viewport height (1 = bottom edge of the
 * screen, 0 = top), 1 when its bottom edge reaches `end`.
 */
export function useSectionProgress(start = 1, end = 0.5): SharedValue<number> {
  const { scrollY, viewport } = useStory();
  const place = useContext(PlaceContext);
  if (!place) throw new Error('useSectionProgress must be used inside a StorySection');
  return useDerivedValue(() => {
    const from = place.y.value - viewport.value * start;
    const to = place.y.value + place.height.value - viewport.value * end;
    if (to <= from) return 0;
    return Math.min(1, Math.max(0, (scrollY.value - from) / (to - from)));
  });
}

/** How far the whole page has scrolled, as it was when the hero filled the screen (0 → 1 over `distance` px). */
export function usePageProgress(distance: number): SharedValue<number> {
  const { scrollY } = useStory();
  return useDerivedValue(() => Math.min(1, Math.max(0, scrollY.value / distance)));
}

export { useStory };
