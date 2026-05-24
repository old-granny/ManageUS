import { useRef, useState, useEffect } from 'react';
import { ComponentIcon }          from '../ComponentIcon.tsx';
import { COMPONENT_CONFIG, type PlacedComponent, type Scene } from '../../types/index.ts';
import configData                  from '../../config.json';
import ResizableComponents         from '../ResizableObjects.tsx';
import NonResizableComponents      from '../NonRezisableObjects.tsx';

interface SceneCreatorTimeLineProps {
  scene:            Scene | undefined;
  selectedComps:    PlacedComponent[];
  onToggleComp:     (comp: PlacedComponent) => void;
  isPlaying?:       boolean;
  componentStates?: Map<string, string>;
}

const ACTIVE_ACTIONS = new Set(['ON', 'OPEN', 'PLAY', 'SHOW', 'PULL']);

export function SceneCreatorTimeLine({
  scene,
  selectedComps,
  onToggleComp,
  isPlaying = false,
  componentStates,
}: SceneCreatorTimeLineProps) {
  const [viewScale, setViewScale] = useState<number>(0.15);
  const [viewPan,   setViewPan]   = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const sectionRef         = useRef<HTMLElement>(null);
  const isViewPanning      = useRef<boolean>(false);
  const startViewPanOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewPanStartPos    = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didPanView         = useRef<boolean>(false);

  // Fit the viewport to the component bounding box on first render
  useEffect(() => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const comps = scene?.components ?? [];
    let minX: number, minY: number, maxX: number, maxY: number;

    if (comps.length === 0) {
      minX = 0; minY = 0;
      maxX = configData.VIRTUAL_STAGE_WIDTH;
      maxY = configData.VIRTUAL_STAGE_HEIGHT;
    } else {
      minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
      for (const comp of comps) {
        const w = comp.width  ?? configData.DEFAULT_COMP_W;
        const h = comp.height ?? configData.DEFAULT_COMP_H;
        minX = Math.min(minX, comp.x);
        minY = Math.min(minY, comp.y);
        maxX = Math.max(maxX, comp.x + w);
        maxY = Math.max(maxY, comp.y + h);
      }
    }

    const PADDING  = 120;
    const contentW = (maxX - minX) + PADDING * 2;
    const contentH = (maxY - minY) + PADDING * 2;
    const fitScale = Math.min(rect.width / contentW, rect.height / contentH);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setViewScale(fitScale);
    setViewPan({
      x: rect.width  / 2 - cx * fitScale,
      y: rect.height / 2 - cy * fitScale,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clampPan(panX: number, panY: number, scale: number): { x: number; y: number } {
    if (!sectionRef.current) return { x: panX, y: panY };
    const { width: vw, height: vh } = sectionRef.current.getBoundingClientRect();
    const sw = configData.VIRTUAL_STAGE_WIDTH  * scale;
    const sh = configData.VIRTUAL_STAGE_HEIGHT * scale;
    return {
      x: Math.min(0, Math.max(vw - sw, panX)),
      y: Math.min(0, Math.max(vh - sh, panY)),
    };
  }

  function handleWheel(e: React.WheelEvent<HTMLElement>) {
    e.preventDefault();
    const factor = 0.08;
    const newScale = Math.min(4, Math.max(0.05, viewScale + (e.deltaY < 0 ? factor : -factor)));
    setViewScale(newScale);
    setViewPan(prev => clampPan(prev.x, prev.y, newScale));
  }

  function handleMouseDown(e: React.MouseEvent<HTMLElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    isViewPanning.current      = true;
    didPanView.current         = false;
    viewPanStartPos.current    = { x: e.clientX, y: e.clientY };
    startViewPanOffset.current = { x: e.clientX - viewPan.x, y: e.clientY - viewPan.y };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (!isViewPanning.current) return;
    const dx = Math.abs(e.clientX - viewPanStartPos.current.x);
    const dy = Math.abs(e.clientY - viewPanStartPos.current.y);
    if (!didPanView.current && (dx > 3 || dy > 3)) didPanView.current = true;
    if (didPanView.current) {
        const rawX = e.clientX - startViewPanOffset.current.x;
        const rawY = e.clientY - startViewPanOffset.current.y;
        setViewPan(clampPan(rawX, rawY, viewScale));
      }
  }

  function handleMouseUp() {
    isViewPanning.current = false;
  }

  return (
    <section
      className="stage-view overflow-hidden"
      ref={sectionRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor:     isViewPanning.current && didPanView.current ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Virtual canvas — same dimensions as the scene editor */}
      <div
        style={{
          position:        'absolute',
          top:             0,
          left:            0,
          width:           `${configData.VIRTUAL_STAGE_WIDTH}px`,
          height:          `${configData.VIRTUAL_STAGE_HEIGHT}px`,
          transform:       `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewScale})`,
          transformOrigin: '0 0',
          backgroundColor: '#475569',
        }}
      >
        {(!scene || scene.components.length === 0) && (
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 text-2xl italic pointer-events-none select-none">
            Empty scene — go back to the scene editor
          </p>
        )}

        {scene?.components.map(comp => {
          const compW       = comp.width  ?? 80;
          const compH       = comp.height ?? 80;
          const isResizable = COMPONENT_CONFIG[comp.kind].isResizable;
          const isSelected  = selectedComps.some(c => c.id === comp.id);

          const liveState = componentStates?.get(comp.id);
          const isOn      = liveState !== undefined && ACTIVE_ACTIONS.has(liveState);
          const hasState  = liveState !== undefined;

          return (
            <div
              key={comp.id}
              style={{
                position:   'absolute',
                left:       `${comp.x}px`,
                top:        `${comp.y}px`,
                width:      `${compW}px`,
                height:     `${compH}px`,
                borderRadius: 4,
                border: isSelected
                  ? '2px solid #22c55e'
                  : hasState
                    ? `2px solid ${isOn ? '#4ade80' : '#f87171'}`
                    : '2px solid transparent',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(34,197,94,0.3)'
                  : hasState && isOn
                    ? '0 0 0 3px rgba(74,222,128,0.25), 0 0 14px 4px rgba(74,222,128,0.2)'
                    : undefined,
                cursor:     'pointer',
                overflow:   'visible',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onClick={() => {
                if (didPanView.current) return;
                onToggleComp(comp);
              }}
            >
              {(() => {
                const Renderer = isResizable
                  ? ResizableComponents[comp.kind]
                  : NonResizableComponents[comp.kind];
                if (Renderer) return <Renderer comp={comp} onStartDrag={() => {}} showName={true} />;
                return <ComponentIcon kind={comp.kind} size={Math.round(Math.min(compW, compH) * 0.7)} />;
              })()}

              {/* Live state badge */}
              {hasState && (
                <div
                  style={{
                    position:        'absolute',
                    bottom:          -20,
                    left:            '50%',
                    transform:       'translateX(-50%)',
                    fontSize:        10,
                    fontWeight:      700,
                    padding:         '2px 6px',
                    borderRadius:    4,
                    background:      isOn ? 'rgba(74,222,128,0.9)' : 'rgba(239,68,68,0.9)',
                    color:           '#fff',
                    whiteSpace:      'nowrap',
                    pointerEvents:   'none',
                    zIndex:          20,
                    boxShadow:       isOn
                      ? '0 0 8px 1px rgba(74,222,128,0.5)'
                      : '0 0 8px 1px rgba(239,68,68,0.4)',
                  }}
                >
                  {liveState}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-3 bg-black/40 text-white/60 text-[11px] px-2 py-0.5 rounded pointer-events-none select-none">
        {Math.round(viewScale * 100)}%
      </div>
    </section>
  );
}
