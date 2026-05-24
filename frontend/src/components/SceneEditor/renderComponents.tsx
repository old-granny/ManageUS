import React from 'react';
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ComponentIcon } from '../ComponentIcon';
import type { ComponentKind, PlacedComponent } from '../../types';
import { COMPONENT_CONFIG, COMPONENT_TEXTURES } from '../../types';
import ResizableComponents from '../ResizableObjects.tsx';
import NonResizableComponents from '../NonRezisableObjects';

type ResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface RenderComponentsProps {
  components: PlacedComponent[];
  selectedId: string | null;
  showName: boolean;
  onSelectComponent: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, comp: PlacedComponent) => void;
  onStartResize: (id: string, dir: ResizeDir, mouseX: number, mouseY: number, comp: PlacedComponent) => void;
  onBringForward: (id: string) => void;
  onBringBackward: (id: string) => void;
  onRemoveComponent: (id: string) => void;
}

const RESIZE_HANDLES: { dir: ResizeDir; cursor: string; style: React.CSSProperties }[] = [
  { dir: 'n', cursor: 'n-resize', style: { top: 0, left: '50%', transform: 'translate(-50%, -50%)' } },
  { dir: 'ne', cursor: 'ne-resize', style: { top: 0, right: 0, transform: 'translate(50%, -50%)' } },
  { dir: 'e', cursor: 'e-resize', style: { top: '50%', right: 0, transform: 'translate(50%, -50%)' } },
  { dir: 'se', cursor: 'se-resize', style: { bottom: 0, right: 0, transform: 'translate(50%, 50%)' } },
  { dir: 's', cursor: 's-resize', style: { bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' } },
  { dir: 'sw', cursor: 'sw-resize', style: { bottom: 0, left: 0, transform: 'translate(-50%, 50%)' } },
  { dir: 'w', cursor: 'w-resize', style: { top: '50%', left: 0, transform: 'translate(-50%, -50%)' } },
  { dir: 'nw', cursor: 'nw-resize', style: { top: 0, left: 0, transform: 'translate(-50%, -50%)' } },
];

export function RenderComponents({
  components,
  selectedId,
  showName,
  onSelectComponent,
  onStartDrag,
  onStartResize,
  onBringForward,
  onBringBackward,
  onRemoveComponent,
}: RenderComponentsProps) {
  return (
    <>
      {components.map(comp => {
        const isResizable = COMPONENT_CONFIG[comp.kind].isResizable;

        const compW = isResizable ? comp.width : 100;
        const compH = isResizable ? comp.height : 100;
        const iconSize = Math.min(Math.round(Math.min(compW, compH) * 0.58), 80);
        const isSelected = selectedId === comp.id;

        return (
          <div
            key={comp.id}
            onMouseDown={() => onSelectComponent(comp.id)}
            className={`group absolute box-border rounded-[4px] border-[1.5px] transition-[border-color,box-shadow] duration-150 overflow-visible ${isSelected ? 'border-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]' : 'border-transparent'}`}
            style={{
              left: `${comp.x}px`,
              top: `${comp.y}px`,
              width: `${compW}px`,
              height: `${compH}px`,
            }}
            title={comp.name}
          >
            {(() => {
              const Renderer = isResizable ? ResizableComponents[comp.kind] : NonResizableComponents[comp.kind];
              if (Renderer) return <Renderer comp={comp} onStartDrag={onStartDrag} showName={showName} />;

              return isResizable ? (
                <div className={`w-full h-full ${COMPONENT_TEXTURES[comp.kind] || 'bg-zinc-800'}`} />
              ) : (
                <div
                  onMouseDown={(e) => onStartDrag(e, comp)}
                  className="cursor-move w-full h-full flex items-center justify-center hover:scale-110 transition-transform duration-150"
                >
                  <ComponentIcon kind={comp.kind as ComponentKind} size={iconSize} />
                </div>
              );
            })()}

            <button
              className="absolute -top-12 -right-3 p-1 bg-zinc-700 hover:bg-zinc-500 text-white rounded shadow transition-all duration-150 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center z-50"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); onBringForward(comp.id); }}
              title="Monter d'une couche"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>

            <button
              className="absolute -top-7 -right-3 p-1 bg-zinc-700 hover:bg-zinc-500 text-white rounded shadow transition-all duration-150 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center z-50"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); onBringBackward(comp.id); }}
              title="Descendre d'une couche"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            <button
              className="absolute -top-2 -right-3 p-1.5 bg-zinc-800 hover:bg-red-600 text-white rounded-full shadow-md border border-zinc-700 hover:border-red-500 transition-all duration-200 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center z-50"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onClick={(e) => { e.stopPropagation(); onRemoveComponent(comp.id); }}
              title={`Retirer ${comp.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>

            {isResizable && RESIZE_HANDLES.map(h => (
              <div
                key={h.dir}
                className="absolute w-3 h-3 bg-white border border-zinc-500 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-yellow-300 transition-all z-20"
                style={{ cursor: h.cursor, ...h.style }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onStartResize(comp.id, h.dir, e.clientX, e.clientY, comp);
                }}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}


