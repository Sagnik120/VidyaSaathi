/**
 * Search: jump to any page or any of your lessons, switch language, sign out.
 * The website's ⌘K command box — on a phone it opens from the search button.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, TextInput, View, useWindowDimensions, type TextStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FlaskConical, Gauge, Home, Languages, LogOut, Plus, Route, Search, Shield, UserRound } from 'lucide-react-native';
import { api } from '@/core/api';
import { useAuth } from '@/providers/auth';
import { useI18n } from '@/providers/i18n';
import { COLORS } from '@/theme/tokens';
import { fontFamily, hasDevanagari } from '@/theme/fonts';
import { tw } from '@/theme/tw';
import { isStaff, tabsFor } from '@/lib/staff';
import type { IconType } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlay';
import { Press } from '@/components/ui/press';
import { Txt } from '@/components/ui/text';

type Item = { id: string; group: string; label: string; hint?: string; icon: IconType; run: () => void };

const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { signOut, user } = useAuth();
  const { height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const inputRef = useRef<TextInput>(null);
  const staff = isStaff(user);

  const lessons = useQuery({ queryKey: ['lessons', 'palette'], queryFn: () => api.listLessons({ limit: 50 }), enabled: open && !staff });

  const items = useMemo<Item[]>(() => {
    const go = (href: Href) => { onClose(); router.push(href); };
    const pagesGroup = t('cmd.pages');
    const staffPages: Item[] = tabsFor(user).map((x) => ({ id: `t-${x.v}`, group: pagesGroup, label: t(x.k), icon: Shield, run: () => go({ pathname: '/admin', params: { tab: x.v } }) }));
    const learnerPages: Item[] = [
      { id: 'home', group: pagesGroup, label: t('nav.dashboard'), icon: Home, run: () => go('/dashboard') },
      { id: 'new', group: pagesGroup, label: t('nav.newLesson'), icon: Plus, run: () => go('/new') },
      { id: 'path', group: pagesGroup, label: t('nav.path'), icon: Route, run: () => go('/path') },
      { id: 'lab', group: pagesGroup, label: t('nav.lab'), icon: FlaskConical, run: () => go('/lab') },
      { id: 'lessons', group: pagesGroup, label: t('nav.lessons'), icon: BookOpen, run: () => go('/lessons') },
      { id: 'progress', group: pagesGroup, label: t('nav.progress'), icon: Gauge, run: () => go('/progress') },
      { id: 'profile', group: pagesGroup, label: t('nav.profile'), icon: UserRound, run: () => go('/profile') },
    ];
    const pages = staff ? [...staffPages, learnerPages[learnerPages.length - 1]] : learnerPages;
    const lessonItems: Item[] = staff ? [] : (lessons.data?.lessons ?? []).map((l) => ({
      id: `l-${l.id}`,
      group: t('cmd.lessons'),
      label: l.title,
      hint: t(`status.${l.status}` as 'status.completed'),
      icon: BookOpen,
      run: () => go(l.status === 'completed' ? `/report/${l.id}` : `/learn/${l.id}`),
    }));
    const actions: Item[] = [
      { id: 'lang', group: t('cmd.actions'), label: t('cmd.switchLang'), icon: Languages, run: () => { setLang(lang === 'en' ? 'hi' : 'en'); onClose(); } },
      { id: 'out', group: t('cmd.actions'), label: t('nav.signOut'), icon: LogOut, run: () => { onClose(); void signOut(); } },
    ];
    const all = [...pages, ...lessonItems, ...actions];
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((i) => i.label.toLowerCase().includes(needle)) : all;
  }, [t, user, staff, lessons.data, q, lang, setLang, onClose, signOut]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [open]);

  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <Dialog open={open} onClose={onClose} align="top" tint={0.2} maxWidth={576} style={{ padding: 0, borderRadius: 24 }}>
      <View style={[tw('overflow-hidden'), { borderRadius: 23 }]}>
        <View style={tw('flex-row items-center gap-3 border-b border-line px-5')}>
          <Search size={16} color={COLORS['ink-3']} />
          <TextInput
            ref={inputRef}
            testID="palette-input"
            value={q}
            onChangeText={setQ}
            placeholder={t('cmd.placeholder')}
            accessibilityLabel={t('cmd.placeholder')}
            placeholderTextColor={COLORS['ink-3']}
            selectionColor={COLORS['sky-500']}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => items[0]?.run()}
            style={[
              tw('h-14 flex-1'),
              { fontSize: 15.7, color: COLORS.ink, paddingVertical: 0, fontFamily: fontFamily({ role: 'sans', weight: 400, italic: false, devanagari: hasDevanagari(q) }) },
              NO_OUTLINE,
            ]}
          />
        </View>
        <ScrollView style={{ maxHeight: height * 0.5 }} contentContainerStyle={tw('p-2')} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {items.length === 0 && <Txt style={tw('px-4 py-10 text-center text-sm text-ink-3')}>{t('cmd.empty', { q })}</Txt>}
          {groups.map((g) => (
            <View key={g} style={tw('mb-1')}>
              <Txt style={[tw('px-3 pb-1 pt-2 font-semibold uppercase text-ink-3'), { fontSize: 11.2, lineHeight: 16, letterSpacing: 0.56 }]}>{g}</Txt>
              {items.filter((i) => i.group === g).map((item) => (
                <Press key={item.id} onPress={item.run} scaleTo={0.99} testID={`cmd-${item.id}`}
                  style={tw('flex-row items-center gap-3 rounded-xl px-3 py-2.5')} activeStyle={{ backgroundColor: COLORS['sky-50'] }}>
                  <item.icon size={16} color={COLORS['ink-3']} />
                  <Txt numberOfLines={1} style={tw('flex-1 text-sm text-ink-2')}>{item.label}</Txt>
                  {item.hint ? <Txt style={tw('text-xs text-ink-3')}>{item.hint}</Txt> : null}
                </Press>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Dialog>
  );
}
