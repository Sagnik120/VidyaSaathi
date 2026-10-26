/**
 * Renders dialogs, sheets and overlays above the whole app (navigation
 * included) — the native stand-in for the website's `position: fixed`.
 * <PortalHost /> sits once at the root; <Portal> sends its children there.
 */
import { useEffect, useId, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const nodes = new Map<string, ReactNode>();
const listeners = new Set<() => void>();
let snapshot: Array<[string, ReactNode]> = [];

function publish() {
  snapshot = Array.from(nodes.entries());
  listeners.forEach((l) => l());
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const getSnapshot = () => snapshot;

export function Portal({ children }: { children: ReactNode }) {
  const id = useId();
  useEffect(() => {
    nodes.set(id, children);
    publish();
  }, [id, children]);
  useEffect(() => () => { nodes.delete(id); publish(); }, [id]);
  return null;
}

export function PortalHost() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <View style={styles.layer}>
      {entries.map(([id, node]) => (
        <View key={id} style={styles.layer}>{node}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
});
