import React, { useRef, useState, useEffect, useMemo } from 'react';
import { type PlacedComponent, type TimelineStep } from '../../types';

interface Track { id: string; name: string; }

interface TrackCreatorTimeLineProps {
  tracks:             Track[];
  selectedTrackId:    string;
  steps:              TimelineStep[];
  sceneComponents:    PlacedComponent[];
  onSelectTrack:      (id: string) => void;
  onAddTrack:         () => void;
  onRemoveTrack:      (id: string) => void;
  onMoveStep:         (stepId: string, toTrackId: string) => void;
  onRemoveStep:       (id: string) => void;
  onUpdateStep:       (id: string, updates: Record<string, any>) => void;
  onBumpToNewTrack:   (stepId: string) => void;
  onPlaybackChange?:  (playing: boolean, states: Map<string, string>) => void;
}

const PIXELS_PER_SECOND = 80;
const TRACK_HEIGHT      = 46;   // must match CSS .timeline-track-data-row height
const RULER_HEIGHT      = 30;   // must match CSS .timeline-ruler-row height

export function TrackCreatorTimeLine({
  tracks,
  selectedTrackId,
  steps,
  sceneComponents,
  onSelectTrack,
  onAddTrack,
  onRemoveTrack,
  onRemoveStep,
  onUpdateStep,
  onBumpToNewTrack,
  onPlaybackChange,
}: TrackCreatorTimeLineProps) {
  const [isPlaying,   setIsPlaying]   = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isDragging,  setIsDragging]  = useState<boolean>(false);   // playhead drag

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const labelsAreaRef = useRef<HTMLDivElement>(null);

  // ── Resize state ───────────────────────────────────────────────────────────
  const [resizingStep, setResizingStep] = useState<{
    id:              string;
    startWidth:      number;
    startOffset:     number;
    startX:          number;
    startScrollLeft: number;
    direction:       'left' | 'right';
  } | null>(null);

  // ── Free-placement drag state ──────────────────────────────────────────────
  const [movingBlock, setMovingBlock] = useState<{
    id:              string;
    origOffset:      number;
    startX:          number;
    startScrollLeft: number;
  } | null>(null);

  // ── Stable refs ───────────────────────────────────────────────────────────
  const currentMouseX       = useRef<number | null>(null);
  const currentMouseY       = useRef<number | null>(null);
  const onUpdateStepRef     = useRef(onUpdateStep);
  const onBumpToNewTrackRef = useRef(onBumpToNewTrack);
  const stepsRef            = useRef(steps);
  const tracksRef           = useRef(tracks);

  useEffect(() => { onUpdateStepRef.current     = onUpdateStep;     }, [onUpdateStep]);
  useEffect(() => { onBumpToNewTrackRef.current  = onBumpToNewTrack; }, [onBumpToNewTrack]);
  useEffect(() => { stepsRef.current             = steps;            }, [steps]);
  useEffect(() => { tracksRef.current            = tracks;           }, [tracks]);

  // Live component states (last fired action per component at current time)
  // "Last action wins" — mirrors the physical device: once a component is
  // turned ON it stays ON until an explicit OFF action fires.
  const componentStates = useMemo(() => {
    const map = new Map<string, string>();
    [...steps]
      .filter(s => (s.startOffset ?? 0) <= currentTime)
      .sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0))
      .forEach(s => {
        if (s.type === 'action') map.set(s.componentId, s.action);
        else if (s.type === 'group') s.actions.forEach(a => map.set(a.componentId, a.action));
      });
    return map;
  }, [steps, currentTime]);

  // Stable string key - only changes value when a step actually fires,
  // so the effect below does NOT fire on every animation frame
  const componentStatesKey = useMemo(
    () => JSON.stringify([...componentStates.entries()].sort()),
    [componentStates],
  );

  const onPlaybackChangeRef = useRef(onPlaybackChange);
  useEffect(() => { onPlaybackChangeRef.current = onPlaybackChange; }, [onPlaybackChange]);

  useEffect(() => {
    onPlaybackChangeRef.current?.(isPlaying, componentStates);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, componentStatesKey]);

  // ── Timeline scale ─────────────────────────────────────────────────────────
  const maxTrackTime = steps.reduce((max, s) =>
    Math.max(max, (s.startOffset ?? 0) + (s.duration ?? 1)),
  0);

  const MAX_TIME       = maxTrackTime > 49 ? (Math.floor(maxTrackTime / 10) * 10) + 10 : 59;
  const isMinutesScale = MAX_TIME > 59;
  const totalWidth     = MAX_TIME * PIXELS_PER_SECOND;

  const graduations: number[] = [];
  for (let t = 0; t <= MAX_TIME; t++) graduations.push(t);

  function formatTick(t: number) {
    if (isMinutesScale) {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${t}s`;
  }

  // ── Scroll sync (vertical) ────────────────────────────────────────────────
  const handleScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollAreaRef.current && scrollAreaRef.current.scrollTop !== e.currentTarget.scrollTop)
      scrollAreaRef.current.scrollTop = e.currentTarget.scrollTop;
  };
  const handleScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
    if (labelsAreaRef.current && labelsAreaRef.current.scrollTop !== e.currentTarget.scrollTop)
      labelsAreaRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  // ── Overlap check: bump overlapping neighbours of a resized step ──────────
  function bumpOverlaps(resizedId: string) {
    const resized = stepsRef.current.find(s => s.id === resizedId);
    if (!resized) return;
    const newStart = resized.startOffset ?? 0;
    const newEnd   = newStart + (resized.duration ?? 1);
    const trackId  = resized.trackId ?? tracksRef.current[0]?.id;

    stepsRef.current
      .filter(s =>
        s.id !== resizedId &&
        (s.trackId ?? tracksRef.current[0]?.id) === trackId,
      )
      .forEach(other => {
        const oStart = other.startOffset ?? 0;
        const oEnd   = oStart + (other.duration ?? 1);
        if (newStart < oEnd && newEnd > oStart) {
          onBumpToNewTrackRef.current(other.id);
        }
      });
  }

  // ── Resize useEffect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!resizingStep) {
      currentMouseX.current = null;
      if (!isDragging && !movingBlock) document.body.style.userSelect = '';
      return;
    }

    document.body.style.userSelect = 'none';
    let animationFrame: number;

    function loop() {
      if (!resizingStep || currentMouseX.current === null) return;
      const area = scrollAreaRef.current;
      if (!area) return;

      const rect          = area.getBoundingClientRect();
      const edgeThreshold = 60;
      let   scrollSpeed   = 0;
      if (currentMouseX.current > rect.right - edgeThreshold) scrollSpeed = 15;
      else if (currentMouseX.current < rect.left + edgeThreshold && area.scrollLeft > 0) scrollSpeed = -15;
      if (scrollSpeed !== 0) area.scrollLeft += scrollSpeed;

      const scrollDelta = area.scrollLeft - resizingStep.startScrollLeft;
      const mouseDelta  = currentMouseX.current - resizingStep.startX;
      const totalDelta  = mouseDelta + scrollDelta;

      if (resizingStep.direction === 'right') {
        let newWidth = resizingStep.startWidth + totalDelta;
        if (newWidth < 40) newWidth = 40;
        onUpdateStepRef.current(resizingStep.id, { duration: newWidth / PIXELS_PER_SECOND });
      } else {
        // Left resize: right edge stays fixed, left edge moves
        const rightEdge   = resizingStep.startOffset + resizingStep.startWidth / PIXELS_PER_SECOND;
        let   newOffset   = resizingStep.startOffset + totalDelta / PIXELS_PER_SECOND;
        if (newOffset < 0) newOffset = 0;
        let   newDuration = rightEdge - newOffset;
        const minDuration = 40 / PIXELS_PER_SECOND;
        if (newDuration < minDuration) {
          newDuration = minDuration;
          newOffset   = rightEdge - minDuration;
        }
        onUpdateStepRef.current(resizingStep.id, { startOffset: newOffset, duration: newDuration });
      }

      animationFrame = requestAnimationFrame(loop);
    }

    function handleMouseMove(e: MouseEvent) { currentMouseX.current = e.clientX; }
    function handleMouseUp() {
      if (resizingStep?.direction === 'left') bumpOverlaps(resizingStep.id);
      setResizingStep(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup',   handleMouseUp);
    currentMouseX.current = resizingStep.startX;
    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup',   handleMouseUp);
      cancelAnimationFrame(animationFrame);
      document.body.style.userSelect = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizingStep]);

  // ── Free-placement drag useEffect ─────────────────────────────────────────
  useEffect(() => {
    if (!movingBlock) {
      currentMouseX.current = null;
      currentMouseY.current = null;
      if (!isDragging && !resizingStep) document.body.style.userSelect = '';
      return;
    }

    document.body.style.userSelect = 'none';
    let animationFrame: number;

    function loop() {
      if (!movingBlock || currentMouseX.current === null) return;
      const area = scrollAreaRef.current;
      if (!area) return;

      const rect          = area.getBoundingClientRect();
      const edgeThreshold = 60;
      let   scrollSpeed   = 0;
      if (currentMouseX.current > rect.right - edgeThreshold) scrollSpeed = 15;
      else if (currentMouseX.current < rect.left + edgeThreshold && area.scrollLeft > 0) scrollSpeed = -15;
      if (scrollSpeed !== 0) area.scrollLeft += scrollSpeed;

      // Horizontal: new startOffset
      const scrollDelta = area.scrollLeft - movingBlock.startScrollLeft;
      const mouseDelta  = currentMouseX.current - movingBlock.startX;
      let   newOffset   = movingBlock.origOffset + (mouseDelta + scrollDelta) / PIXELS_PER_SECOND;
      if (newOffset < 0) newOffset = 0;

      // Vertical: which track is the mouse over?
      const mouseY        = currentMouseY.current ?? 0;
      const absoluteY     = mouseY - rect.top + area.scrollTop;
      const trackIdx      = Math.max(0, Math.min(
        tracksRef.current.length - 1,
        Math.floor((absoluteY - RULER_HEIGHT) / TRACK_HEIGHT),
      ));
      const targetTrackId = tracksRef.current[trackIdx]?.id;

      const updates: Record<string, any> = { startOffset: newOffset };
      if (targetTrackId) updates.trackId = targetTrackId;
      onUpdateStepRef.current(movingBlock.id, updates);

      animationFrame = requestAnimationFrame(loop);
    }

    function handleMouseMove(e: MouseEvent) {
      currentMouseX.current = e.clientX;
      currentMouseY.current = e.clientY;
    }
    function handleMouseUp() { setMovingBlock(null); }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup',   handleMouseUp);
    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup',   handleMouseUp);
      cancelAnimationFrame(animationFrame);
      document.body.style.userSelect = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movingBlock]);

  // ── Playhead drag useEffect ───────────────────────────────────────────────
  useEffect(() => {
    if (!isDragging) { currentMouseX.current = null; return; }
    document.body.style.userSelect = 'none';
    let animationFrame: number;

    function loop() {
      if (!isDragging || currentMouseX.current === null) return;
      const area = scrollAreaRef.current;
      if (!area) return;

      const rect          = area.getBoundingClientRect();
      const edgeThreshold = 60;
      let   scrollSpeed   = 0;
      if (currentMouseX.current > rect.right - edgeThreshold) scrollSpeed = 15;
      else if (currentMouseX.current < rect.left + edgeThreshold && area.scrollLeft > 0) scrollSpeed = -15;
      if (scrollSpeed !== 0) area.scrollLeft += scrollSpeed;

      let newX    = currentMouseX.current - rect.left + area.scrollLeft;
      if (newX < 0) newX = 0;
      let newTime = newX / PIXELS_PER_SECOND;
      if (newTime > MAX_TIME) newTime = MAX_TIME;
      setCurrentTime(newTime);

      animationFrame = requestAnimationFrame(loop);
    }

    function onMouseMove(e: MouseEvent) { currentMouseX.current = e.clientX; }
    function onMouseUp()                { setIsDragging(false); }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      cancelAnimationFrame(animationFrame);
      document.body.style.userSelect = '';
    };
  }, [isDragging, MAX_TIME]);

  // ── Playback animation ────────────────────────────────────────────────────
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    function update(now: number) {
      if (!isPlaying) return;
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= MAX_TIME) { setIsPlaying(false); return MAX_TIME; }
        return next;
      });
      animationFrame = requestAnimationFrame(update);
    }

    if (isPlaying) { lastTime = performance.now(); animationFrame = requestAnimationFrame(update); }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, MAX_TIME]);

  // ── Auto-scroll playhead ──────────────────────────────────────────────────
  useEffect(() => {
    if (!scrollAreaRef.current || isDragging || resizingStep || movingBlock) return;
    const area    = scrollAreaRef.current;
    const headX   = currentTime * PIXELS_PER_SECOND;
    const visLeft = area.scrollLeft;
    const visRight = visLeft + area.clientWidth;
    if (headX > visRight - 50)                    area.scrollLeft = headX - area.clientWidth + 50;
    else if (headX < visLeft + 50 && visLeft > 0) area.scrollLeft = Math.max(0, headX - 50);
  }, [currentTime, isDragging, resizingStep, movingBlock]);

  function stepLabel(step: TimelineStep): string {
    if (step.type === 'wait') return `⏱ ${step.waitMs / 1000}s`;
    
    // NOUVEAU: Si c'est un bloc groupé, on affiche combien d'actions il contient !
    if (step.type === 'group') return `📦 Groupe (${step.actions.length} éléments)`;
    
    const comp = sceneComponents.find(c => c.id === step.componentId);
    return `${comp ? comp.name : step.componentId} → ${step.action}`;
  }

  const isInteracting = !!(resizingStep || movingBlock);

  return (
    <section className="timeline-panel">

      <div className="playback-controls">
        <button className="ctrl-btn" onClick={() => setIsPlaying(true)}>▶</button>
        <button className="ctrl-btn" onClick={() => setIsPlaying(false)}>⏸</button>
        <button className="ctrl-btn" onClick={() => { setIsPlaying(false); setCurrentTime(0); }}>⏹</button>
        <button className="btn btn-outline btn-add-track" onClick={onAddTrack}>
          + Add Track
        </button>
      </div>

      <div className="timeline-grid-container">

        {/* Left labels column */}
        <div className="timeline-labels-column" ref={labelsAreaRef} onScroll={handleScrollLeft}>
          <div className="ruler-corner-cell">Time</div>
          {tracks.map(track => (
            <div
              key={track.id}
              className="track-label-cell"
              onClick={() => onSelectTrack(track.id)}
              style={{
                cursor:     'pointer',
                borderLeft: selectedTrackId === track.id ? '3px solid #3b82f6' : '3px solid transparent',
                background: selectedTrackId === track.id ? 'rgba(59,130,246,0.15)' : undefined,
              }}
            >
              <span>{track.name}</span>
              <button
                className="track-del-btn"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onRemoveTrack(track.id);
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div
          className="timeline-scrollable-area"
          ref={scrollAreaRef}
          style={{ position: 'relative' }}
          onScroll={handleScrollRight}
        >
          <div className="timeline-grid-content">

            {/* Playhead line */}
            <div
              className="playhead-line"
              style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }}
              onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                currentMouseX.current = e.clientX;
                setIsDragging(true);
                setIsPlaying(false);
              }}
            />

            {/* Ruler */}
            <div className="timeline-ruler-row">
              <div
                className="playhead-head"
                style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }}
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                  currentMouseX.current = e.clientX;
                  setIsDragging(true);
                  setIsPlaying(false);
                }}
              />
              {graduations.map(t => (
                <div
                  key={t}
                  className="ruler-tick-cell"
                  style={{ width: `${PIXELS_PER_SECOND}px` }}
                >
                  <span className="tick-text">{formatTick(t)}</span>
                  <div className="tick-mark" />
                </div>
              ))}
            </div>

            {/* Track rows */}
            {tracks.map(track => {
              const trackSteps = steps.filter(s =>
                s.trackId ? s.trackId === track.id : track.id === tracks[0]?.id,
              );
              const isActive = selectedTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className="timeline-track-data-row"
                  style={{
                    width:      `${totalWidth}px`,
                    outline:    isActive ? '1px solid rgba(59,130,246,0.4)' : undefined,
                    background: isActive ? 'rgba(59,130,246,0.07)' : '#1e293b',
                  }}
                >
                  {trackSteps.length === 0 && (
                    <span className="track-empty-hint"></span>
                  )}

                  {trackSteps.map(step => {
                    const blockWidth = (step.duration    ?? 1) * PIXELS_PER_SECOND;
                    const blockLeft  = (step.startOffset ?? 0) * PIXELS_PER_SECOND;
                    const isMoving   = movingBlock?.id  === step.id;
                    const isResizing = resizingStep?.id === step.id;

                    return (
                      <div
                        key={step.id}
                        className="track-block"
                        style={{
                          position:  'absolute',
                          left:      `${blockLeft}px`,
                          width:     `${blockWidth}px`,
                          top:       '50%',
                          transform: 'translateY(-50%)',
                          cursor:    isMoving ? 'grabbing' : 'grab',
                          opacity:   isMoving || isResizing ? 0.75 : 1,
                          zIndex:    isMoving || isResizing ? 10 : 1,
                        }}
                        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                          if ((e.target as HTMLElement).closest('.resize-handle-left, .resize-handle-right, .step-del')) return;
                          if (isInteracting) return;
                          e.preventDefault();
                          currentMouseX.current = e.clientX;
                          currentMouseY.current = e.clientY;
                          setMovingBlock({
                            id:              step.id,
                            origOffset:      step.startOffset ?? 0,
                            startX:          e.clientX,
                            startScrollLeft: scrollAreaRef.current?.scrollLeft ?? 0,
                          });
                        }}
                      >
                        <div
                          className="resize-handle-left"
                          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            if (movingBlock) return;
                            currentMouseX.current = e.clientX;
                            setResizingStep({
                              id:              step.id,
                              startWidth:      blockWidth,
                              startOffset:     step.startOffset ?? 0,
                              startX:          e.clientX,
                              startScrollLeft: scrollAreaRef.current?.scrollLeft ?? 0,
                              direction:       'left',
                            });
                          }}
                        />

                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                          {stepLabel(step)}
                        </span>

                        <button
                          className="step-del"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => onRemoveStep(step.id)}
                        >
                          x
                        </button>

                        <div
                          className="resize-handle-right"
                          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            if (movingBlock) return;
                            currentMouseX.current = e.clientX;
                            setResizingStep({
                              id:              step.id,
                              startWidth:      blockWidth,
                              startOffset:     step.startOffset ?? 0,
                              startX:          e.clientX,
                              startScrollLeft: scrollAreaRef.current?.scrollLeft ?? 0,
                              direction:       'right',
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}