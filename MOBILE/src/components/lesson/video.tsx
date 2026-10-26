/**
 * Lesson video on the device's own player (expo-video).
 *  - <LessonVideo> is the classroom's player: it hands the controller a
 *    `VideoPort` and reports time / play / end / failure back to it.
 *  - <MediaVideo> simply plays one finished segment (rewatch, review).
 */
import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer, type VideoPlayer } from 'expo-video';
import { Loader2 } from 'lucide-react-native';
import { playableMedia, type PlayableMedia } from '@/core/api';
import { tw } from '@/theme/tw';
import type { VideoPort } from '@/features/classroom/controller';
import { Spin } from '@/components/motion';

type Callbacks = { onTime: () => void; onPlay: () => void; onEnded: () => void; onFailed: () => void };

/** What the controller last asked for; applied again once a new source has loaded. */
type Wanted = { play: boolean; startAt: number; ended: boolean };

function configure(player: VideoPlayer) {
  player.timeUpdateEventInterval = 0.25;
  player.keepScreenOnWhilePlaying = true;
}

/** The controller's view of the player. Loading is asynchronous, so play/seek requests are remembered in `want`. */
function createPort(player: VideoPlayer, want: Wanted, onFailed: () => void): VideoPort {
  return {
    load: (media, startAt) => {
      Object.assign(want, { play: false, startAt, ended: false });
      void player.replaceAsync({ uri: media.uri, headers: media.headers }).catch(onFailed);
    },
    play: () => { want.play = true; want.ended = false; player.play(); },
    pause: () => { want.play = false; player.pause(); },
    seek: (seconds) => { want.ended = false; player.currentTime = seconds; },
    get currentTime() { return player.currentTime; },
    get duration() { return player.duration; },
    get playing() { return player.playing; },
    get ended() { return want.ended; },
  };
}

/** A source finished loading: jump to where the lesson left off, and play if that was asked for. */
function applyWanted(player: VideoPlayer, want: Wanted) {
  if (want.startAt > 0) player.currentTime = want.startAt;
  want.startAt = 0;
  if (want.play) player.play();
}

export function LessonVideo({ onPort, controls, style, testID, onTime, onPlay, onEnded, onFailed }: Callbacks & {
  /** Called once with the port, and with null when the player goes away. */
  onPort: (port: VideoPort | null) => void;
  controls: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const player = useVideoPlayer(null, configure);
  const [want] = useState<Wanted>(() => ({ play: false, startAt: 0, ended: false }));

  useEffect(() => {
    const port = createPort(player, want, onFailed);
    onPort(port);
    return () => onPort(null);
  }, [player, want, onPort, onFailed]);

  useEventListener(player, 'sourceLoad', () => applyWanted(player, want));
  useEventListener(player, 'timeUpdate', onTime);
  useEventListener(player, 'playingChange', ({ isPlaying }) => { if (isPlaying) onPlay(); });
  useEventListener(player, 'playToEnd', () => { Object.assign(want, { ended: true, play: false }); onEnded(); });
  useEventListener(player, 'statusChange', ({ status }) => { if (status === 'error') onFailed(); });

  return <VideoView testID={testID} player={player} nativeControls={controls} contentFit="contain" fullscreenOptions={{ enable: true }} playsInline style={style} />;
}

/** Plays one stored segment from start; owner-scoped, so it carries the session. */
export function MediaVideo({ url, style, onError }: { url: string; style?: StyleProp<ViewStyle>; onError?: (e: Error) => void }) {
  const [media, setMedia] = useState<PlayableMedia | null>(null);
  const fail = useRef(onError);
  useEffect(() => { fail.current = onError; });
  useEffect(() => {
    let alive = true;
    let made: PlayableMedia | null = null;
    playableMedia(url)
      .then((m) => { made = m; if (alive) setMedia(m); else m.release?.(); })
      .catch((e) => { if (alive) fail.current?.(e as Error); });
    return () => { alive = false; made?.release?.(); setMedia(null); };
  }, [url]);

  if (!media) {
    return <View style={[tw('items-center justify-center bg-ink'), style]}><Spin><Loader2 size={24} color="rgba(255,255,255,0.7)" /></Spin></View>;
  }
  return <Playing media={media} style={style} onError={(e) => fail.current?.(e)} />;
}

function Playing({ media, style, onError }: { media: PlayableMedia; style?: StyleProp<ViewStyle>; onError: (e: Error) => void }) {
  const player = useVideoPlayer({ uri: media.uri, headers: media.headers }, (p) => { p.play(); });
  useEventListener(player, 'statusChange', ({ status, error }) => { if (status === 'error') onError(new Error(error?.message || 'video')); });
  return <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} playsInline style={[tw('bg-ink'), style]} />;
}
