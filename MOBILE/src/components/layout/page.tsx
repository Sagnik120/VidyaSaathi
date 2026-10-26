/**
 * The body of every signed-in page: it scrolls, lifts into place when the
 * page opens, keeps clear of the floating tab bar, and can be pulled down to
 * reload (the phone's version of the browser's refresh).
 */
import { useCallback, useState, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/theme/tokens';
import { PageLift } from '@/components/motion';
import { TAB_BAR_SPACE } from './app-shell';

export function Page({ children, onRefresh, style, maxWidth = 768, scrollRef }: {
  children: ReactNode;
  /** pull-to-refresh: resolve when the data is back */
  onRefresh?: () => Promise<unknown> | unknown;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  scrollRef?: Ref<ScrollView>;
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <PageLift>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom }}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS['sky-600']} colors={[COLORS['sky-600']]} /> : undefined}
        >
          <View style={[{ width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 32 }, style]}>{children}</View>
        </ScrollView>
      </PageLift>
    </KeyboardAvoidingView>
  );
}
