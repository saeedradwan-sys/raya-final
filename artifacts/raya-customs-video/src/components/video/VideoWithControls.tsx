import {
  ChevronDown,
  ChevronUp,
  Repeat,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;

function ProgressSegments({
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsed(performance.now() - startedAt);
    }, PROGRESS_TICK_MS);
    return () => window.clearInterval(timer);
  }, [tick]);

  const progress =
    activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;

  return (
    <div className="flex flex-1 items-center gap-1.5">
      {sceneKeys.map((key, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onJumpTo(index)}
            className="relative h-3 min-h-3 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/25"
            aria-label={`Jump to scene ${index + 1}`}
            aria-current={active ? 'true' : undefined}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/90 transition-[width] duration-100"
              style={{ width: `${active ? progress * 100 : 0}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ControlBar({
  visible,
  collapsed,
  locked,
  muted,
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onToggleLock,
  onToggleMuted,
  onJumpTo,
  onToggleCollapsed,
}: {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  muted: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onToggleLock: () => void;
  onToggleMuted: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
}) {
  const buttonClass =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg transition-colors';

  return (
    <div
      className={`flex items-center gap-3 bg-black/55 px-5 py-4 backdrop-blur-sm transition-all duration-200 ease-out ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={onToggleLock}
        className={`${buttonClass} ${
          locked
            ? 'bg-white/15 text-white hover:bg-white/25'
            : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
        title={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-pressed={locked}
      >
        <Repeat className="h-8 w-8" />
      </button>

      <button
        type="button"
        onClick={onToggleMuted}
        className={`${buttonClass} text-white/60 hover:bg-white/10 hover:text-white`}
        title={muted ? 'Unmute preview audio' : 'Mute preview audio'}
        aria-label={muted ? 'Unmute preview audio' : 'Mute preview audio'}
        aria-pressed={!muted}
      >
        {muted ? (
          <VolumeX className="h-8 w-8" />
        ) : (
          <Volume2 className="h-8 w-8" />
        )}
      </button>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <ProgressSegments
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        tick={tick}
        onJumpTo={onJumpTo}
      />

      <div className="shrink-0 font-mono text-xl tabular-nums text-white/60">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      <button
        type="button"
        onClick={onToggleCollapsed}
        className={`${buttonClass} text-white/60 hover:bg-white/10 hover:text-white`}
        title={collapsed ? 'Show controls' : 'Hide controls'}
        aria-label={collapsed ? 'Show controls' : 'Hide controls'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronUp className="h-10 w-10" />
        ) : (
          <ChevronDown className="h-10 w-10" />
        )}
      </button>
    </div>
  );
}

export default function VideoWithControls() {
  const isIframed =
    typeof window !== 'undefined' && window.self !== window.top;
  const controls = useSceneControls(SCENE_DURATIONS);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') setHovering(true);
    },
    [],
  );
  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') setHovering(false);
    },
    [],
  );
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
    },
    [collapsed],
  );
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      if (!value) {
        setHovering(false);
        setTapPinned(false);
      }
      return !value;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const handleDocumentPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (
        sensorRef.current &&
        !sensorRef.current.contains(event.target as Node)
      ) {
        setTapPinned(false);
      }
    };
    document.addEventListener('pointerdown', handleDocumentPointer);
    return () =>
      document.removeEventListener('pointerdown', handleDocumentPointer);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  const barVisible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <VideoTemplate
        key={controls.mountKey}
        durations={controls.durations}
        loop
        muted={muted}
        onSceneChange={controls.onSceneChange}
      />

      <div
        ref={sensorRef}
        className="absolute inset-x-0 bottom-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="w-full flex-1" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={controls.locked}
          muted={muted}
          sceneKeys={controls.sceneKeys}
          activeIndex={controls.activeIndex}
          activeDuration={controls.activeDuration}
          tick={controls.tick}
          onToggleLock={controls.toggleLock}
          onToggleMuted={() => setMuted((value) => !value)}
          onJumpTo={controls.jumpTo}
          onToggleCollapsed={handleToggleCollapsed}
        />
      </div>
    </div>
  );
}