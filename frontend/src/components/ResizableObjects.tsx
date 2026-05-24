import React from 'react';
import type { PlacedComponent, ComponentKind } from '../types';
import { COMPONENT_TEXTURES } from '../types';

type CompRendererProps = { comp: PlacedComponent; onStartDrag?: (e: React.MouseEvent, comp: PlacedComponent) => void; showName?: boolean };

const DEFAULT_FALLBACK = 80;

export const SectionScene: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => {
  const w = comp.width ?? DEFAULT_FALLBACK;
  const h = comp.height ?? DEFAULT_FALLBACK;
  return (
    <>
      <div
        onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)}
        className={`cursor-move w-full h-full border-2 border-dashed border-blue-500 rounded relative group-hover:border-blue-400 group-hover:bg-blue-500/10 transition-all ${COMPONENT_TEXTURES[comp.kind] || 'bg-zinc-800'}`}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800 opacity-60 group-hover:opacity-100 transition-opacity">
            {Math.round(w)} × {Math.round(h)}
          </span>
        </div>
      </div>
      <span className="comp-name">{comp.name}</span>
    </>
  );
};

export const Curtain: React.FC<CompRendererProps> = ({ comp, onStartDrag }) => {
  const w = comp.width ?? DEFAULT_FALLBACK;
  const h = comp.height ?? DEFAULT_FALLBACK;
  const gid = `curtain_${comp.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return (
    <>
      <div
        onMouseDown={(e) => onStartDrag && onStartDrag(e, comp)}
        className={`cursor-move w-full h-full rounded relative overflow-hidden border border-zinc-700/30`}>

        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          preserveAspectRatio="none"
          aria-label="Rideau décoratif"
          style={{ display: 'block', pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id={`curtainGrad-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b0000" />
              <stop offset="50%" stopColor="#c31f1f" />
              <stop offset="100%" stopColor="#5a0000" />
            </linearGradient>
            <radialGradient id={`sheen-${gid}`} cx="30%" cy="20%" r="60%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {/* Base fabric */}
          <rect x="0" y="0" width="200" height="200" fill={`url(#curtainGrad-${gid})`} />

          {/* Vertical pleats (soft strokes) */}
          {Array.from({ length: 11 }).map((_, i) => {
            const x = 8 + i * 18;
            const d = `M ${x} 0 C ${x - 6} 50 ${x + 6} 150 ${x} 200`;
            return (
              <path key={i} d={d} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="6" strokeLinecap="round" />
            );
          })}

          {/* Sheen overlay */}
          <rect x="0" y="0" width="200" height="200" fill={`url(#sheen-${gid})`} />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800 opacity-70">
            {Math.round(w)} x {Math.round(h)}
          </span>
        </div>
      </div>
      <span className="comp-name">{comp.name}</span>
    </>
  );
};

// Partial map keyed by ComponentKind — only include resizable kinds here
export const ResizableComponents: Partial<Record<ComponentKind, React.FC<CompRendererProps>>> = {
  section_scene: SectionScene,
  curtain: Curtain,
};

export default ResizableComponents;
