import { useRef, useState, useEffect } from 'react';
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
}

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
}: TrackCreatorTimeLineProps) {
  const [isPlaying,   setIsPlaying]   = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isDragging,  setIsDragging]  = useState<boolean>(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const graduations   = Array.from({ length: 51 }, (_, i) => (i * 0.2).toFixed(1) + 's');

  // ── Playback animation ────────────────────────────────────────────────────
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    const MAX_TIME = 10;

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
  }, [isPlaying]);

  // ── Playhead drag ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDragging) { document.body.style.userSelect = ''; return; }

    const MAX_TIME = 10;
    document.body.style.userSelect = 'none';

    function onMouseMove(e: MouseEvent) {
      if (!scrollAreaRef.current) return;
      const rect = scrollAreaRef.current.getBoundingClientRect();
      let newX = e.clientX - rect.left + scrollAreaRef.current.scrollLeft;
      if (newX < 0) newX = 0;
      let newTime = newX / 350;
      if (newTime > MAX_TIME) newTime = MAX_TIME;
      setCurrentTime(newTime);
    }

    function onMouseUp() { setIsDragging(false); }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // ── Auto-scroll to follow playhead ────────────────────────────────────────
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const area     = scrollAreaRef.current;
    const headX    = currentTime * 350;
    const visLeft  = area.scrollLeft;
    const visRight = visLeft + area.clientWidth;
    if (headX > visRight - 50)            area.scrollLeft = headX - area.clientWidth + 50;
    else if (headX < visLeft + 50 && visLeft > 0) area.scrollLeft = Math.max(0, headX - 50);
  }, [currentTime]);

  function stepLabel(step: TimelineStep): string {
    if (step.type === 'wait') return `⏱ ${step.waitMs / 1000}s`;
    const comp = sceneComponents.find(c => c.id === step.componentId);
    return `${comp ? comp.name : step.componentId} → ${step.action}`;
  }

  return (
    <section className="timeline-panel">

      {/* Playback controls */}
      <div className="playback-controls">
        <button className="ctrl-btn" onClick={() => setIsPlaying(true)}>▶</button>
        <button className="ctrl-btn" onClick={() => setIsPlaying(false)}>⏸</button>
        <button className="ctrl-btn" onClick={() => { setIsPlaying(false); setCurrentTime(0); }}>⏹</button>
        <button className="btn btn-outline btn-add-track" onClick={onAddTrack}>
          ＋ Add Track
        </button>
      </div>

      <div className="timeline-grid-container">

        {/* Fixed labels column */}
        <div className="timeline-labels-column">
          <div className="ruler-corner-cell">Temps</div>
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
                onClick={(e) => { e.stopPropagation(); onRemoveTrack(track.id); }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div className="timeline-scrollable-area" ref={scrollAreaRef} style={{ position: 'relative' }}>

          {/* Playhead */}
          <div
            className="playhead-line"
            style={{ left: `${currentTime * 350}px` }}
            onMouseDown={() => { setIsDragging(true); setIsPlaying(false); }}
          />

          {/* Ruler */}
          <div className="timeline-ruler-row">
            {graduations.map((time, idx) => (
              <div key={idx} className="ruler-tick-cell">
                <span className="tick-text">{time}</span>
                <div className="tick-mark" />
              </div>
            ))}
          </div>

          {/* Track rows */}
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
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const stepId = e.dataTransfer.getData('stepId');
                  if (stepId) onMoveStep(stepId, track.id);
                }}
              >
                {trackSteps.length === 0 && (
                  <span className="track-empty-hint">Glisser un bloc ici</span>
                )}
                {trackSteps.map(step => (
                  <div
                    key={step.id}
                    className="track-block"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('stepId', step.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <span>{stepLabel(step)}</span>
                    <button className="step-del" onClick={() => onRemoveStep(step.id)}>×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
