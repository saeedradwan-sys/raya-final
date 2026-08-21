import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ComponentType } from 'react';
import { NoiseOverlay } from './NoiseOverlay';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { GlobalContinuity } from './video_scenes/GlobalContinuity';

export const SCENE_DURATIONS: Record<string, number> = {
  0: 4500, // Title Hook
  1: 4000, // Workflow
  2: 4500, // Tracking
  3: 4000, // Portal
  4: 4000, // Accounting
  5: 3500, // Outro
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  0: Scene1,
  1: Scene2,
  2: Scene3,
  3: Scene4,
  4: Scene5,
  5: Scene6,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const offsets: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    offsets[key] = cumulativeMs / 1000;
    cumulativeMs += duration;
  }
  return offsets;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (
      Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC
    ) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div
      className="w-[100vw] h-[100vh] overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      <NoiseOverlay />
      
      {/* Background Grid that persists across all scenes */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none z-0" />
      
      {/* Global Continuity layer for elements that persist across scenes */}
      <GlobalContinuity currentScene={sceneIndex} />

      {/* mode="popLayout" = new snaps in while old animates out */}
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
