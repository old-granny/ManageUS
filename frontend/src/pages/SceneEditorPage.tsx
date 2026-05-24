import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { ComponentIcon } from '../components/ComponentIcon';
import { useAppStore } from '../store/AppContext';
import { KIND_LABELS, type PlacedComponent, type ComponentKind, type Scene, COMPONENT_TEXTURES } from '../types';
import { COMPONENT_CONFIG } from '../types';
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

import configData from '../config.json';
import { Sidebar } from '../components/SideBarSceneEditorPage';
import ResizableComponents from '../components/ResizableObjects.tsx';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const historyRef = useRef<PlacedComponent[][]>([]);
  const MAX_HISTORY = 60;

  function pushHistory() {
    // Save a shallow copy of current components (sufficient for undoing positions)
    historyRef.current.push(components.map(c => ({ ...c })));
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
  }

  
  // États pour la caméra et actions souris
  const [scale, setScale] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const GRID_SIZE = 40;
  const SNAP_THRESHOLD = 10;
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

    // snapshot for undo then snap initial placement if enabled and within threshold
    pushHistory();
    if (snapToGrid) {
      const snapX = Math.round(placed.x / GRID_SIZE) * GRID_SIZE;
      const snapY = Math.round(placed.y / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(placed.x - snapX) <= SNAP_THRESHOLD) placed.x = snapX;
      if (Math.abs(placed.y - snapY) <= SNAP_THRESHOLD) placed.y = snapY;
    }

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
    // snapshot for undo
    pushHistory();
    setSelectedId(comp.id);

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

      let newX = d.origX + dx;
      let newY = d.origY + dy;

      if (snapToGrid) {
        const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        if (Math.abs(newX - snappedX) <= SNAP_THRESHOLD) newX = snappedX;
        if (Math.abs(newY - snappedY) <= SNAP_THRESHOLD) newY = snappedY;
      }

      setComponents(prev =>
        prev.map(c => c.id === d.id ? { ...c, x: newX, y: newY } : c)
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
    // Final snap when releasing a dragged component
    if (draggingComp.current && snapToGrid) {
      const d = draggingComp.current;
      setComponents(prev => prev.map(c => {
        if (c.id !== d.id) return c;
        let newX = c.x;
        let newY = c.y;
        const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        if (Math.abs(newX - snappedX) <= SNAP_THRESHOLD) newX = snappedX;
        if (Math.abs(newY - snappedY) <= SNAP_THRESHOLD) newY = snappedY;
        return { ...c, x: newX, y: newY };
      }));
    }

    isPanning.current = false;
    resizing.current  = null;
    draggingComp.current = null; // 🚀 On relâche la composante
  }

  function startResize(id: string, dir: ResizeDir, mouseX: number, mouseY: number, comp: PlacedComponent) {
    if (!COMPONENT_CONFIG[comp.kind].isResizable) return;
    // snapshot for undo
    pushHistory();

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
    pushHistory();
    setComponents(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function bringForward(id: string) {
    const idx = components.findIndex(c => c.id === id);
    if (idx === -1 || idx === components.length - 1) return;
    pushHistory();
    setComponents(prev => {
      const arr = prev.slice();
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }

  function bringBackward(id: string) {
    const idx = components.findIndex(c => c.id === id);
    if (idx <= 0) return;
    pushHistory();
    setComponents(prev => {
      const arr = prev.slice();
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
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
      clearCurrentSceneCookies();
      clearCurrentSaveScene();
      setComponents([]); 
    }
  }
  

  function clearCurrentSceneCookies(){
    localStorage.removeItem('graphicus_scene_backup'); 
  }
  
  function clearCurrentSaveScene(){
    // On rebâtit la scène vide pour écraser celle en mémoire dans le Reducer
    if (activeScene) {
      const emptyScene: Scene = {
        ...activeScene,
        name: sceneName,
        components: [] // On passe un tableau vide
      };
      
      // On dispatch la sauvegarde de la scène vide dans ton store global
      dispatch({ type: 'SAVE_SCENE', scene: emptyScene });
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

  const gridStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
    pointerEvents: 'none',
    zIndex: 0,
  };

  // Keyboard handlers: Delete to remove selected, Ctrl/Cmd+Z to undo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

      // Delete / Backspace to remove selected component
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        pushHistory();
        setComponents(prev => prev.filter(c => c.id !== selectedId));
        setSelectedId(null);
        return;
      }

      // Undo (Ctrl/Cmd + Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const prev = historyRef.current.pop();
        if (prev) {
          setComponents(prev);
          setSelectedId(null);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, components]);

  return (
    /* Root: top-bar (48 px) | sidebar (200 px) + stage (rest), full viewport */
    <div className="grid h-screen overflow-hidden" style={{ gridTemplateColumns: '200px 1fr', gridTemplateRows: '48px 1fr' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="col-span-2 flex items-center gap-3 px-4 bg-[#0b1121] border-b-2 border-black text-white text-sm">
        <span className="font-bold text-lg mr-2">Managus</span>
        <label htmlFor="scene-name" className="text-white/70 whitespace-nowrap">Scène :</label>
        <input
          id="scene-name"
          value={sceneName}
          onChange={e => setSceneName(e.target.value)}
          placeholder="Nom de la scène..."
          className="bg-[#2d2d3f] border border-zinc-600 rounded-md text-white px-3 py-1 w-64 outline-none focus:border-green-500 transition-colors"
        />
        <button
          onClick={resetCamera}
          className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors text-white text-xs font-semibold"
        >
          Recentre ({Math.round(scale * 100)}%)
        </button>
        <button
          onClick={() => setShowGrid(s => !s)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${showGrid ? 'bg-blue-700 hover:bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'} text-white`}
        >
          {showGrid ? 'Grille: On' : 'Grille: Off'}
        </button>
        <button
          onClick={() => setSnapToGrid(s => !s)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${snapToGrid ? 'bg-purple-700 hover:bg-purple-600' : 'bg-zinc-700 hover:bg-zinc-600'} text-white`}
        >
          {snapToGrid ? 'Snap: On' : 'Snap: Off'}
        </button>
      </header>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <Sidebar
        paletteKinds={PALETTE_KINDS}
        onPaletteDragStart={handlePaletteDragStart}
        onExport={handleExport}
        onSave={handleSave}
        onGoToTimeline={handleGoToTimeline}
        onReset={resetAllComponents}
      />

      {/* ── Stage canvas ──────────────────────────────────────────────────── */}
      <main
        ref={stageRef}
        onDragOver={handleStageDragOver}
        onDrop={handleStageDrop}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onContextMenu={handleContextMenu}
        className="relative overflow-hidden"
        style={{
          cursor: isPanning.current ? 'grabbing' : 'grab',
          /* wood plank texture */
          backgroundColor: '#c8a46e',
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(0,0,0,.07) 0px, transparent 1px, transparent 30px, rgba(0,0,0,.07) 31px),
            repeating-linear-gradient(180deg, rgba(255,255,255,.04) 0px, transparent 5px, transparent 60px, rgba(255,255,255,.04) 61px)
          `,
        }}
      >
        {/* virtual infinite canvas */}
        <div
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
          {/* Grid overlay */}
          {showGrid && <div style={gridStyle} />}

          {/* Empty hint */}
          {components.length === 0 && (
            <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black/25 text-xl italic pointer-events-none select-none">
              Glisser des composantes n'importe où dans l'espace
            </p>
          )}

          {/* Placed components */}
          {components.map(comp => {
            const compW = comp.width  ?? DEFAULT_COMP_W;
            const compH = comp.height ?? DEFAULT_COMP_H;
            const iconSize = Math.min(Math.round(Math.min(DEFAULT_COMP_W, DEFAULT_COMP_H) * 0.58), 80);
            const isResizable = COMPONENT_CONFIG[comp.kind].isResizable;
            const isSelected  = selectedId === comp.id;

            return (
              <div
                key={comp.id}
                onMouseDown={() => setSelectedId(comp.id)}
                className="group absolute box-border"
                style={{
                  left:    `${comp.x}px`,
                  top:     `${comp.y}px`,
                  width:   `${compW}px`,
                  height:  `${compH}px`,
                  borderRadius: 4,
                  border: isSelected
                    ? '1.5px solid #22c55e'
                    : '1.5px solid transparent',
                  boxShadow: isSelected ? '0 0 0 2px rgba(34,197,94,0.2)' : undefined,
                  transition: 'border-color 0.12s',
                  overflow: 'visible',
                }}
                title={comp.name}
              >
                {/* Per-kind renderer */}
                {(() => {
                  const Renderer = isResizable
                    ? ResizableComponents[comp.kind]
                    : NonResizableComponents[comp.kind];
                  if (Renderer) return <Renderer comp={comp} onStartDrag={startCompDrag} showName={isVisibelName} />;
                  return isResizable
                    ? <div className={`w-full h-full ${COMPONENT_TEXTURES[comp.kind] || 'bg-zinc-800'}`} />
                    : (
                      <div onMouseDown={(e) => startCompDrag(e, comp)} className="cursor-move w-full h-full flex items-center justify-center hover:scale-110 transition-transform duration-150">
                        <ComponentIcon kind={comp.kind} size={iconSize} />
                      </div>
                    );
                })()}

                {/* ── Overlay action buttons (visible on hover) ─────────── */}
                {/* Bring forward */}
                <button
                  className="absolute -top-12 -right-3 p-1 bg-zinc-700 hover:bg-zinc-500 text-white rounded shadow transition-all duration-150 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center z-50"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => { e.stopPropagation(); bringForward(comp.id); }}
                  title="Monter d'une couche"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>

                {/* Bring backward */}
                <button
                  className="absolute -top-7 -right-3 p-1 bg-zinc-700 hover:bg-zinc-500 text-white rounded shadow transition-all duration-150 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center z-50"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => { e.stopPropagation(); bringBackward(comp.id); }}
                  title="Descendre d'une couche"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button
                  className="absolute -top-2 -right-3 p-1.5 bg-zinc-800 hover:bg-red-600 text-white rounded-full shadow-md border border-zinc-700 hover:border-red-500 transition-all duration-200 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 flex items-center justify-center z-50"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onClick={(e) => { e.stopPropagation(); removeComponent(comp.id); }}
                  title={`Retirer ${comp.name}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>

                {/* ── Resize handles (8-way) ────────────────────────────── */}
                {isResizable && RESIZE_HANDLES.map(h => (
                  <div
                    key={h.dir}
                    className="absolute w-3 h-3 bg-white border border-zinc-500 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-yellow-300 transition-all z-20"
                    style={{ cursor: h.cursor, ...h.style }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      startResize(comp.id, h.dir, e.clientX, e.clientY, comp);
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}