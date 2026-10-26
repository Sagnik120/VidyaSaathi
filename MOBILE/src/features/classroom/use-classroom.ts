import { useEffect, useState, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { ClassroomController, type ClassroomState } from './controller';

const noop = () => () => {};
const nil = () => null;

/**
 * One live classroom per (lesson, session). Bumping `session` tears the
 * controller down and starts a fresh one — this app's "reload the page".
 */
export function useClassroom(lessonId: string, session = 0) {
  const [ctl, setCtl] = useState<ClassroomController | null>(null);

  useEffect(() => {
    const c = new ClassroomController(lessonId, (href) => router.replace(href));
    setCtl(c);
    void c.start();
    return () => { c.dispose(); setCtl(null); };
  }, [lessonId, session]);

  const state = useSyncExternalStore<ClassroomState | null>(ctl?.subscribe ?? noop, ctl?.getSnapshot ?? nil, nil);
  return { ctl, state };
}
