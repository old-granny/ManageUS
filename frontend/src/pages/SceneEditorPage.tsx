import { useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { ComponentIcon } from '../components/ComponentIcon';
import { useAppStore } from '../store/AppContext';
import { KIND_LABELS, type PlacedComponent, type ComponentKind, type Scene, COMPONENT_TEXTURES } from '../types';
import { COMPONENT_CONFIG } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';

import configData from '../config.json';
import { Sidebar } from '../components/SideBarSceneEditorPage';
import { ResizableComponents } from '../components/ResizableObjects';
import NonResizableComponents from '../components/NonRezisableObjects';

const DEFAULT_COMP_W = configData.DEFAULT_COMP_W;
const DEFAULT_COMP_H = configData.DEFAULT_COMP_H;
const MIN_COMP_SIZE = configData.MIN_COMP_SIZE;
const VIRTUAL_STAGE_WIDTH = configData.VIRTUAL_STAGE_WIDTH;
const VIRTUAL_STAGE_HEIGHT = configData.VIRTUAL_STAGE_HEIGHT;

const PALETTE_KINDS: ComponentKind[] = ['light', 'speaker', 'projector', 'curtain', 'section_scene', 'corde', 'flame'];

type ResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface ResizingState {
  id:           string;
  dir:          ResizeDir;
  startMouseX:  number;
  startMouseY:  number;
  origX:        number;
  origY:        number;
  origW:        number;
  origH:        number;
}

// 📦 État pour déplacer une composante existante
interface DraggingCompState {
  id:           string;
  startMouseX:  number;
  startMouseY:  number;
  origX:        number;
  origY:        number;
}

const RESIZE_HANDLES: { dir: ResizeDir; cursor: string; style: CSSProperties }[] = [
  { dir: 'n',  cursor: 'n-resize',  style: { top: 0,      left: '50%', transform: 'translate(-50%, -50%)' } },
  { dir: 'ne', cursor: 'ne-resize', style: { top: 0,      right: 0,    transform: 'translate(50%, -50%)'  } },
  { dir: 'e',  cursor: 'e-resize',  style: { top: '50%',  right: 0,    transform: 'translate(50%, -50%)'  } },
  { dir: 'se', cursor: 'se-resize', style: { bottom: 0,   right: 0,    transform: 'translate(50%, 50%)'   } },
  { dir: 's',  cursor: 's-resize',  style: { bottom: 0,   left: '50%', transform: 'translate(-50%, 50%)'  } },
  { dir: 'sw', cursor: 'sw-resize', style: { bottom: 0,   left: 0,     transform: 'translate(-50%, 50%)'  } },
  { dir: 'w',  cursor: 'w-resize',  style: { top: '50%',  left: 0,     transform: 'translate(-50%, -50%)' } },
  { dir: 'nw', cursor: 'nw-resize', style: { top: 0,      left: 0,     transform: 'translate(-50%, -50%)' } },
];

function generateId(kind: ComponentKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function SceneEditorPage() {
  const { state, dispatch } = useAppStore();
  const activeScene = state.scenes.find(s => s.id === state.activeSceneId);

  const [sceneName, setSceneName] = useState<string>(activeScene?.name ?? 'Ma scène');
  
  // Components de present
  const [components, setComponents] = useState<PlacedComponent[]>(activeScene?.components ?? []);
  const isVisibelName = true;

  
  // États pour la caméra et actions souris
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef<boolean>(false);
  const startPanOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const resizing = useRef<ResizingState | null>(null);
  const draggingComp = useRef<DraggingCompState | null>(null); // 🚀 Ref pour le drag interne

  const draggingKind = useRef<ComponentKind | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  function handleStageDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleStageDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const kind = draggingKind.current;
    if (!kind || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const xInPixels = (e.clientX - rect.left - pan.x) / scale;
    const yInPixels = (e.clientY - rect.top - pan.y) / scale;

    const count = components.filter(c => c.kind === kind).length + 1;

    const placed: PlacedComponent = {
      id:     generateId(kind),
      kind,
      name:   `${KIND_LABELS[kind]} ${count}`,
      x:      xInPixels - DEFAULT_COMP_W / 2,
      y:      yInPixels - DEFAULT_COMP_H / 2,
      width:  DEFAULT_COMP_W,
      height: DEFAULT_COMP_H,
    };

    setComponents(prev => [...prev, placed]);
    draggingKind.current = null;
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const zoomFactor = 0.08;
    let newScale = scale + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    newScale = Math.min(4, Math.max(0.15, newScale));
    setScale(newScale);
  }

  // MouseDown global sur la stage (uniquement pour le déplacement de caméra)
  function handleStageMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button === 0) return; // Clic gauche ignoré ici pour laisser les composants se faire dragger
    e.preventDefault();
    isPanning.current = true;
    startPanOffset.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  // 🚀 Déclencheur du déplacement quand on clique précisément au centre d'un élément
  function startCompDrag(e: React.MouseEvent, comp: PlacedComponent) {
    if (e.button !== 0) return; // Uniquement au clic gauche
    e.stopPropagation(); // Bloque l'événement pour ne pas déplacer la caméra en même temps
    e.preventDefault();

    draggingComp.current = {
      id: comp.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: comp.x,
      origY: comp.y
    };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    // 1. Déplacement de la caméra (Pan)
    if (isPanning.current) {
      setPan({
        x: e.clientX - startPanOffset.current.x,
        y: e.clientY - startPanOffset.current.y,
      });
      return;
    }

    // 2. 🚀 Déplacement d'une composante existante
    if (draggingComp.current) {
      const d = draggingComp.current;
      const dx = (e.clientX - d.startMouseX) / scale; // Divisé par le scale pour suivre le zoom
      const dy = (e.clientY - d.startMouseY) / scale;

      setComponents(prev =>
        prev.map(c => c.id === d.id ? { ...c, x: d.origX + dx, y: d.origY + dy } : c)
      );
      return;
    }
    
    // 3. Redimensionnement d'une zone
    if (!resizing.current) return;

    const r  = resizing.current;
    const dx = (e.clientX - r.startMouseX) / scale;
    const dy = (e.clientY - r.startMouseY) / scale;

    let newW = r.origW;
    let newH = r.origH;
    let newX = r.origX;
    let newY = r.origY;

    if (r.dir.includes('e')) { newW = Math.max(MIN_COMP_SIZE, r.origW + dx); }
    if (r.dir.includes('w')) { newW = Math.max(MIN_COMP_SIZE, r.origW - dx); newX = r.origX + r.origW - newW; }
    if (r.dir.includes('s')) { newH = Math.max(MIN_COMP_SIZE, r.origH + dy); }
    if (r.dir.includes('n')) { newH = Math.max(MIN_COMP_SIZE, r.origH - dy); newY = r.origY + r.origH - newH; }

    setComponents(prev =>
      prev.map(c => c.id === r.id ? { ...c, x: newX, y: newY, width: newW, height: newH } : c)
    );
  }

  function handleMouseUpOrLeave() {
    isPanning.current = false;
    resizing.current  = null;
    draggingComp.current = null; // 🚀 On relâche la composante
  }

  function startResize(id: string, dir: ResizeDir, mouseX: number, mouseY: number, comp: PlacedComponent) {
    if (!COMPONENT_CONFIG[comp.kind].isResizable) return;
    
    resizing.current = {
      id, dir,
      startMouseX: mouseX,
      startMouseY: mouseY,
      origX: comp.x,
      origY: comp.y,
      origW: comp.width  ?? DEFAULT_COMP_W,
      origH: comp.height ?? DEFAULT_COMP_H,
    };
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  function removeComponent(id: string) {
    setComponents(prev => prev.filter(c => c.id !== id));
  }

  function buildScene(): Scene {
    return {
      id: activeScene?.id ?? `scene-${Date.now()}`,
      name: sceneName,
      components,
    };
  }

  function handleSave() {
    const scene = buildScene();
    dispatch({ type: 'SAVE_SCENE', scene });
    dispatch({ type: 'SET_ACTIVE_SCENE', id: scene.id });
    alert(`✅ Scène "${sceneName}" sauvegardée !`);
  }

  function handleExport() {
    const scene = buildScene();
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sceneName.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleGoToTimeline() {
    const scene = buildScene();
    dispatch({ type: 'SAVE_SCENE', scene });
    dispatch({ type: 'SET_ACTIVE_SCENE', id: scene.id });
    dispatch({ type: 'SET_PAGE', page: 'timeline-editor' });
  }

  function handlePaletteDragStart(kind: ComponentKind) {
    draggingKind.current = kind;
  }

  function resetAllComponents(){
    if (components.length === 0) return;

    const confirmReset = window.confirm(
      "Est-vous certain de vouloir vider la scène ? Tous tes composants placés seront supprimés."
    );

    if (confirmReset) {
      setComponents([]); 
    }
  }
  
  function resetCamera() {
    setScale(0.5);
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      setPan({ 
        x: rect.width / 2 - (VIRTUAL_STAGE_WIDTH * 0.5) / 2, 
        y: rect.height / 2 - (VIRTUAL_STAGE_HEIGHT * 0.5) / 2 
      });
    } else {
      setPan({ x: 0, y: 0 });
    }
  }

  return (
    <div className="scene-editor">
      <header className="scene-topbar">
        <span className="topbar-logo">Managus</span>
        <label htmlFor="scene-name">Scène :</label>
        <input
          id="scene-name"
          value={sceneName}
          onChange={e => setSceneName(e.target.value)}
          placeholder="Nom de la scène..."
        />
        <button onClick={resetCamera} title="Recentre la scène">
          Recentre la vue ({Math.round(scale * 100)}%)
        </button>
      </header>

      <Sidebar
        paletteKinds={PALETTE_KINDS}
        onPaletteDragStart={handlePaletteDragStart}
        onExport={handleExport}
        onSave={handleSave}
        onGoToTimeline={handleGoToTimeline}
        onReset={resetAllComponents}
      />

      <main
        className="stage-canvas"
        ref={stageRef}
        onDragOver={handleStageDragOver}
        onDrop={handleStageDrop}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onContextMenu={handleContextMenu}
        style={{ cursor: isPanning.current ? 'grabbing' : 'grab', overflow: 'hidden', position: 'relative' }}
      >
        <div 
          className="stage-viewport"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: `${VIRTUAL_STAGE_WIDTH}px`,
            height: `${VIRTUAL_STAGE_HEIGHT}px`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {components.length === 0 && (
            <p className="stage-hint" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }}>
              Glisser des composantes n'importe où dans l'espace
            </p>
          )}

          {components.map(comp => {
            const compW    = comp.width  ?? DEFAULT_COMP_W;
            const compH    = comp.height ?? DEFAULT_COMP_H;
            const iconSize = Math.min(Math.round(Math.min(DEFAULT_COMP_W, DEFAULT_COMP_H) * 0.58), 80);
            const isResizable = COMPONENT_CONFIG[comp.kind].isResizable;

            return (
              <div
                key={comp.id}
                className={`placed-comp group ${isResizable ? 'resizable-zone' : 'fixed-equipment'}`}
                style={{
                  position:       'absolute',
                  left:           `${comp.x}px`,
                  top:            `${comp.y}px`,
                  width:          `${compW}px`,
                  height:         `${compH}px`,
                  transform:      'none',
                  justifyContent: 'center',
                }}
                title={comp.name}
              >
                {/* Render component via per-kind renderers (keeps markup centralized) */}
                {(() => {
                  const Renderer = isResizable ? ResizableComponents[comp.kind] : NonResizableComponents[comp.kind];
                  if (Renderer) {
                    return <Renderer comp={comp} onStartDrag={startCompDrag} showName={isVisibelName} />;
                  }
                  // Fallback if no renderer defined for this kind
                  return isResizable ? (
                    <div className={`w-full h-full ${COMPONENT_TEXTURES[comp.kind] || 'bg-zinc-800'}`} />
                  ) : (
                    <div onMouseDown={(e) => startCompDrag(e, comp)} className="cursor-move transform group-hover:scale-110 transition-transform duration-150">
                      <ComponentIcon kind={comp.kind} size={iconSize} />
                    </div>
                  );
                })()}

                

                <button
                  className="absolute -top-2 -right-2 p-1.5 bg-zinc-800 text-white rounded-full shadow-md border border-zinc-700 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all duration-200 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center cursor-pointer z-10"
                  onMouseDown={(e) => e.stopPropagation()} // Bloque l'enclenchement du drag sur le bouton poubelle
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removeComponent(comp.id); 
                  }}
                  title={"Retirer le " + comp.name}
                >
                  <TrashIcon className="w-3.5 h-3.5 transition-colors" />
                </button>

                {/* ── Poignées de redimensionnement ── */}
                {isResizable && 
                  RESIZE_HANDLES.map(h => (
                    <div
                      key={h.dir}
                      className="resize-handle w-2 h-2 bg-blue-500 border border-white rounded-sm hover:bg-blue-400 hover:scale-125 transition-all z-20"
                      style={{ position: 'absolute', cursor: h.cursor, ...h.style }}
                      onMouseDown={(e) => {
                        e.stopPropagation(); // Bloque l'enclenchement du drag sur les poignées
                        e.preventDefault();
                        startResize(comp.id, h.dir, e.clientX, e.clientY, comp);
                      }}
                    />
                  ))
                }
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}