import React from 'react';
import type { PlacedComponent, ComponentKind } from '../types';
import { COMPONENT_TEXTURES } from '../types';

type CompRendererProps = { comp: PlacedComponent; onStartDrag?: (e: React.MouseEvent, comp: PlacedComponent) => void; showName?: boolean };

const DEFAULT_FALLBACK = 80;

export const SectionScene: React.FC<CompRendererProps> = ({ comp }) => {
  const w = comp.width ?? DEFAULT_FALLBACK;
  const h = comp.height ?? DEFAULT_FALLBACK;
  return (
    <>
      <div className={`w-full h-full border-2 border-dashed border-blue-500 rounded relative group-hover:border-blue-400 group-hover:bg-blue-500/10 transition-all ${COMPONENT_TEXTURES[comp.kind] || 'bg-zinc-800'}`}>
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

export const Curtain: React.FC<CompRendererProps> = ({ comp }) => {
  const w = comp.width ?? DEFAULT_FALLBACK;
  const h = comp.height ?? DEFAULT_FALLBACK;
  return (
    <>
      <div className={`w-full h-full rounded relative overflow-hidden ${COMPONENT_TEXTURES[comp.kind] || 'bg-zinc-800'} border border-zinc-700/30`}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800 opacity-70">
            {Math.round(w)} × {Math.round(h)}
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
