import React, { useRef, useState, useEffect } from 'react';
import { type PlacedComponent, type TimelineStep } from '../../types';

interface Track { id: string; name: string; }

interface TrackCreatorTimeLineProps {
  tracks:           Track[];
  selectedTrackId:  string;
  steps:            TimelineStep[];
  sceneComponents:  PlacedComponent[];
  onSelectTrack:    (id: string) => void;
  onAddTrack:       () => void;
  onRemoveTrack:    (id: string) => void;
  onMoveStep:       (stepId: string, toTrackId: string) => void;
  onRemoveStep:     (id: string) => void;
  onUpdateStep:     (id: string, updates: Record<string, any>) => void; 
}

const PIXELS_PER_SECOND = 80;

export function TrackCreatorTimeLine({
  tracks,
  selectedTrackId,
  steps,
  sceneComponents,
  onSelectTrack,
  onAddTrack,
  onRemoveTrack,
  onMoveStep,
  onRemoveStep,
  onUpdateStep
}: TrackCreatorTimeLineProps) {
  const [isPlaying,   setIsPlaying]   = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isDragging,  setIsDragging]  = useState<boolean>(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const labelsAreaRef = useRef<HTMLDivElement>(null);
  
  const [resizingStep, setResizingStep] = useState<{ 
    id: string; 
    startWidth: number; 
    startX: number; 
    startScrollLeft: number;
    direction: 'left' | 'right'; 
  } | null>(null);

  const currentMouseX = useRef<number | null>(null);
  const onUpdateStepRef = useRef(onUpdateStep);
  
  useEffect(() => {
    onUpdateStepRef.current = onUpdateStep;
  }, [onUpdateStep]);

  // ── CALCUL DYNAMIQUE DU TEMPS MAXIMUM ET DE L'ÉCHELLE ─────────────────────
  const maxTrackTime = tracks.reduce((max, track) => {
    const trackSteps = steps.filter(s =>
      s.trackId ? s.trackId === track.id : track.id === tracks[0]?.id
    );
    const totalDuration = trackSteps.reduce((acc, step) => acc + (step.duration || 1), 0);
    const gapsDuration = Math.max(0, trackSteps.length - 1) * (8 / PIXELS_PER_SECOND);
    return Math.max(max, totalDuration + gapsDuration);
  }, 0);

  // AJOUT/RÉDUCTION PAR BOND DE 10 SECONDES (Si > 49, on arrondit à la dizaine supérieure)
  const MAX_TIME = maxTrackTime > 49 ? (Math.floor(maxTrackTime / 10) * 10) + 10 : 59;
  const isMinutesScale = MAX_TIME > 59;

  const tickInterval = 1; 
  const graduations: number[] = [];
  for (let t = 0; t <= MAX_TIME; t += tickInterval) {
    graduations.push(t);
  }

  function formatTick(t: number) {
    if (isMinutesScale) {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return t + 's';
  }

  // ── SYNCHRONISATION DU SCROLL ─────────────────────────────────────────────
  const handleScrollLeft = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollAreaRef.current && scrollAreaRef.current.scrollTop !== e.currentTarget.scrollTop) {
      scrollAreaRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleScrollRight = (e: React.UIEvent<HTMLDivElement>) => {
    if (labelsAreaRef.current && labelsAreaRef.current.scrollTop !== e.currentTarget.scrollTop) {
      labelsAreaRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // ── REDIMENSIONNEMENT AVEC AUTO-SCROLL CONTINU ────────────────────────────
  useEffect(() => {
    if (!resizingStep) {
      currentMouseX.current = null;
      if (!isDragging) document.body.style.userSelect = '';
      return;
    }

    document.body.style.userSelect = 'none';
    let animationFrame: number;

    function loop() {
      if (!resizingStep || currentMouseX.current === null) return;
      const area = scrollAreaRef.current;
      if (!area) return;

      const rect = area.getBoundingClientRect();
      const edgeThreshold = 60; 
      let scrollSpeed = 0;

      if (currentMouseX.current > rect.right - edgeThreshold) {
        scrollSpeed = 15; 
      } else if (currentMouseX.current < rect.left + edgeThreshold && area.scrollLeft > 0) {
        scrollSpeed = -15; 
      }

      if (scrollSpeed !== 0) {
        area.scrollLeft += scrollSpeed;
      }

      const currentScrollLeft = area.scrollLeft;
      const scrollDelta = currentScrollLeft - resizingStep.startScrollLeft;
      const mouseDelta = currentMouseX.current - resizingStep.startX;
      const totalDelta = mouseDelta + scrollDelta; 
      
      let newWidth = resizingStep.startWidth + (resizingStep.direction === 'right' ? totalDelta : -totalDelta);
      if (newWidth < 40) newWidth = 40; 
      
      const newDuration = newWidth / PIXELS_PER_SECOND;
      onUpdateStepRef.current(resizingStep.id, { duration: newDuration });

      animationFrame = requestAnimationFrame(loop);
    }

    function handleMouseMove(e: MouseEvent) {
      currentMouseX.current = e.clientX;
    }

    function handleMouseUp() {
      setResizingStep(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    currentMouseX.current = resizingStep.startX;
    animationFrame = requestAnimationFrame(loop); 

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrame);
      document.body.style.userSelect = '';
    };
  }, [resizingStep, isDragging]);

  // ── DRAG DU CURSEUR (PLAYHEAD) AVEC AUTO-SCROLL CONTINU ───────────────────
  useEffect(() => {
    if (!isDragging) { 
      currentMouseX.current = null;
      return; 
    }
    document.body.style.userSelect = 'none';
    let animationFrame: number;

    function loop() {
      if (!isDragging || currentMouseX.current === null) return;
      const area = scrollAreaRef.current;
      if (!area) return;

      const rect = area.getBoundingClientRect();
      const edgeThreshold = 60;
      let scrollSpeed = 0;

      if (currentMouseX.current > rect.right - edgeThreshold) {
        scrollSpeed = 15;
      } else if (currentMouseX.current < rect.left + edgeThreshold && area.scrollLeft > 0) {
        scrollSpeed = -15;
      }

      if (scrollSpeed !== 0) {
        area.scrollLeft += scrollSpeed;
      }

      let newX = currentMouseX.current - rect.left + area.scrollLeft;
      if (newX < 0) newX = 0;
      let newTime = newX / PIXELS_PER_SECOND;
      if (newTime > MAX_TIME) newTime = MAX_TIME;
      setCurrentTime(newTime);

      animationFrame = requestAnimationFrame(loop);
    }

    function onMouseMove(e: MouseEvent) {
      currentMouseX.current = e.clientX;
    }
    function onMouseUp() { setIsDragging(false); }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationFrame);
      document.body.style.userSelect = '';
    };
  }, [isDragging, MAX_TIME]);

  // ── ANIMATION DU PLAYBACK ─────────────────────────────────────────────────
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    function updatePlayhead(now: number) {
      if (!isPlaying) return;
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= MAX_TIME) { setIsPlaying(false); return MAX_TIME; }
        return next;
      });
      animationFrame = requestAnimationFrame(updatePlayhead);
    }

    if (isPlaying) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(updatePlayhead);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, MAX_TIME]);

  // ── AUTO-SCROLL DE LA SCÈNE LORS DE LA LECTURE (PLAY) ─────────────────────
  useEffect(() => {
    if (!scrollAreaRef.current || isDragging || resizingStep) return;
    const area     = scrollAreaRef.current;
    const headX    = currentTime * PIXELS_PER_SECOND;
    const visLeft  = area.scrollLeft;
    const visRight = visLeft + area.clientWidth;
    if (headX > visRight - 50)            area.scrollLeft = headX - area.clientWidth + 50;
    else if (headX < visLeft + 50 && visLeft > 0) area.scrollLeft = Math.max(0, headX - 50);
  }, [currentTime, isDragging, resizingStep]);

  function stepLabel(step: TimelineStep): string {
    if (step.type === 'wait') return `⏱ ${step.waitMs / 1000}s`;
    const comp = sceneComponents.find(c => c.id === step.componentId);
    return `${comp ? comp.name : step.componentId} → ${step.action}`;
  }

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
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onRemoveTrack(track.id); }}
              >
                x
              </button>
            </div>
          ))}
        </div>

        <div 
          className="timeline-scrollable-area" 
          ref={scrollAreaRef} 
          style={{ position: 'relative' }} 
          onScroll={handleScrollRight}
        >
          <div className="timeline-grid-content">
            
            {/* Ligne rouge du curseur (en dessous de la règle) */}
            <div
              className="playhead-line"
              style={{ left: `${currentTime * PIXELS_PER_SECOND}px` }}
              onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => { 
                currentMouseX.current = e.clientX;
                setIsDragging(true); 
                setIsPlaying(false); 
              }}
            />

            {/* Règle et Tête du curseur (collés en haut) */}
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

              {graduations.map((time) => (
                <div 
                  key={time} 
                  className="ruler-tick-cell" 
                  style={{ width: `${tickInterval * PIXELS_PER_SECOND}px` }} 
                >
                  <span className="tick-text">{formatTick(time)}</span>
                  <div className="tick-mark" />
                </div>
              ))}
            </div>

            {tracks.map(track => {
              const trackSteps = steps.filter(s =>
                s.trackId ? s.trackId === track.id : track.id === tracks[0]?.id
              );
              const isActive = selectedTrackId === track.id;

              return (
                <div
                  key={track.id}
                  className="timeline-track-data-row"
                  style={{
                    outline:    isActive ? '1px solid rgba(59,130,246,0.4)' : undefined,
                    background: isActive ? 'rgba(59,130,246,0.07)' : undefined,
                  }}
                  onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                  onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    const stepId = e.dataTransfer.getData('stepId');
                    if (stepId) onMoveStep(stepId, track.id);
                  }}
                >
                  {trackSteps.length === 0 && (
                    <span className="track-empty-hint">Glisser un bloc ici</span>
                  )}
                  {trackSteps.map(step => {
                    const blockWidth = (step.duration || 1) * PIXELS_PER_SECOND;

                    return (
                      <div
                        key={step.id}
                        className="track-block"
                        style={{ width: `${blockWidth}px` }}
                        draggable={!resizingStep}
                        onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                          if (resizingStep) { e.preventDefault(); return; }
                          e.dataTransfer.setData('stepId', step.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div 
                          className="resize-handle-left"
                          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation(); 
                            currentMouseX.current = e.clientX;
                            setResizingStep({ 
                              id: step.id, 
                              startWidth: blockWidth, 
                              startX: e.clientX,
                              startScrollLeft: scrollAreaRef.current?.scrollLeft || 0,
                              direction: 'left'
                            });
                          }}
                        />

                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{stepLabel(step)}</span>
                        <button className="step-del" onClick={() => onRemoveStep(step.id)}>×</button>
                        
                        <div 
                          className="resize-handle-right"
                          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation(); 
                            currentMouseX.current = e.clientX;
                            setResizingStep({ 
                              id: step.id, 
                              startWidth: blockWidth, 
                              startX: e.clientX,
                              startScrollLeft: scrollAreaRef.current?.scrollLeft || 0,
                              direction: 'right'
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