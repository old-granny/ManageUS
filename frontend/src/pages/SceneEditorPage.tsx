import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store/AppContext';
import { KIND_LABELS, type PlacedComponent, type ComponentKind, type Scene } from '../types';
import { COMPONENT_CONFIG } from '../types';
import { Headbar } from '../components/SceneEditor/headbar.tsx';
import configData from '../config.json';
import { Sidebar } from '../components/SceneEditor/SideBarSceneEditorPage.tsx';
import { RenderComponents } from '../components/SceneEditor/renderComponents.tsx';

const MIN_COMP_SIZE = configData.MIN_COMP_SIZE;
const VIRTUAL_STAGE_WIDTH = configData.VIRTUAL_STAGE_WIDTH;
const VIRTUAL_STAGE_HEIGHT = configData.VIRTUAL_STAGE_HEIGHT;
const DEFAULT_COMP_W = configData.DEFAULT_COMP_W;
const DEFAULT_COMP_H = configData.DEFAULT_COMP_H;

const PALETTE_KINDS: ComponentKind[] = ['led', 'speaker', 'projector', 'curtain', 'section_scene', 'corde', 'flame'];

const DEFAULT_COMPONENT_SIZES: Record<ComponentKind, { width: number; height: number }> = {
  led: { width: 92, height: 72 },
  speaker: { width: 72, height: 96 },
  projector: { width: 102, height: 68 },
  curtain: { width: 128, height: 170 },
  section_scene: { width: 180, height: 120 },
  corde: { width: 56, height: 118 },
  flame: { width: 64, height: 96 },
};

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

function generateId(kind: ComponentKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampRectToStage(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const clampedWidth = Math.max(MIN_COMP_SIZE, Math.min(width, VIRTUAL_STAGE_WIDTH));
  const clampedHeight = Math.max(MIN_COMP_SIZE, Math.min(height, VIRTUAL_STAGE_HEIGHT));
  const clampedX = Math.min(Math.max(x, 0), Math.max(0, VIRTUAL_STAGE_WIDTH - clampedWidth));
  const clampedY = Math.min(Math.max(y, 0), Math.max(0, VIRTUAL_STAGE_HEIGHT - clampedHeight));

  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(clampedWidth, VIRTUAL_STAGE_WIDTH - clampedX),
    height: Math.min(clampedHeight, VIRTUAL_STAGE_HEIGHT - clampedY),
  };
}

export function SceneEditorPage() {
  const { state, dispatch } = useAppStore();
  const activeScene = state.scenes.find(s => s.id === state.activeSceneId);

  const [sceneName, setSceneName] = useState<string>(activeScene?.name ?? 'Ma scène');
  
  // Components de present
  const [components, setComponents] = useState<PlacedComponent[]>(activeScene?.components ?? []);
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

  const MAX_LEDS = configData.MAX_LED;
  const MAX_FLAMME = configData.MAX_FLAMME;
  const MAX_CURTAIN = configData.MAX_CURTAIN;
  const MAX_PROJECTOR = configData.MAX_PROJECTOR;
  const MAX_ROPE = configData.MAX_ROPE;

  function handleStageDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const kind = draggingKind.current;
    if (!kind || !stageRef.current) return;

    if (kind === 'led' && components.filter(c => c.kind === 'led').length >= MAX_LEDS) {
      draggingKind.current = null;
      return;
    }

    if (kind === 'flame' && components.filter(c => c.kind === 'flame').length >= MAX_FLAMME) {
      draggingKind.current = null;
      return;
    }

    if (kind === 'curtain' && components.filter(c => c.kind === 'curtain').length >= MAX_CURTAIN) {
      draggingKind.current = null;
      return;
    }

    if (kind === 'projector' && components.filter(c => c.kind === 'projector').length >= MAX_PROJECTOR) {
      draggingKind.current = null;
      return;
    }

    if (kind === 'corde' && components.filter(c => c.kind === 'corde').length >= MAX_ROPE) {
      draggingKind.current = null;
      return;
    }

    if (kind === 'speaker' && components.filter(c => c.kind === 'speaker').length >= MAX_ROPE) {
      draggingKind.current = null;
      return;
    }

    const rect = stageRef.current.getBoundingClientRect();
    const xInPixels = (e.clientX - rect.left - pan.x) / scale;
    const yInPixels = (e.clientY - rect.top - pan.y) / scale;

    const count = components.filter(c => c.kind === kind).length + 1;
    const defaultSize = DEFAULT_COMPONENT_SIZES[kind];

    // For LEDs, find the lowest free slot (1–4)
    const ledId = kind === 'led'
      ? ([1, 2, 3, 4].find(n => !components.some(c => c.kind === 'led' && c.ledId === n)) ?? 1)
      : undefined;

    // For flames, find the lowest free slot (1–3)
    const fireId = kind === 'flame'
      ? ([1, 2, 3].find(n => !components.some(c => c.kind === 'flame' && c.fireId === n)) ?? 1)
      : undefined;

    const placed: PlacedComponent = {
      id:     generateId(kind),
      kind,
      name:   `${KIND_LABELS[kind]} ${ledId ?? fireId ?? count}`,
      x:      xInPixels - defaultSize.width / 2,
      y:      yInPixels - defaultSize.height / 2,
      width:  defaultSize.width,
      height: defaultSize.height,
      ...(ledId  !== undefined ? { ledId }  : {}),
      ...(fireId !== undefined ? { fireId } : {}),
    };

    // snapshot for undo then snap initial placement if enabled and within threshold
    pushHistory();
    if (snapToGrid) {
      const snapX = Math.round(placed.x / GRID_SIZE) * GRID_SIZE;
      const snapY = Math.round(placed.y / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(placed.x - snapX) <= SNAP_THRESHOLD) placed.x = snapX;
      if (Math.abs(placed.y - snapY) <= SNAP_THRESHOLD) placed.y = snapY;
    }

    const boundedPlaced = clampRectToStage(placed.x, placed.y, placed.width ?? DEFAULT_COMP_W, placed.height ?? DEFAULT_COMP_H);
    placed.x = boundedPlaced.x;
    placed.y = boundedPlaced.y;
    placed.width = boundedPlaced.width;
    placed.height = boundedPlaced.height;

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
      const draggedComp = components.find(component => component.id === d.id);
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

      const bounded = clampRectToStage(
        newX,
        newY,
        draggedComp?.width ?? DEFAULT_COMP_W,
        draggedComp?.height ?? DEFAULT_COMP_H,
      );

      setComponents(prev =>
        prev.map(c => c.id === d.id ? { ...c, x: bounded.x, y: bounded.y } : c)
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

    const bounded = clampRectToStage(newX, newY, newW, newH);

    setComponents(prev =>
      prev.map(c => c.id === r.id ? { ...c, x: bounded.x, y: bounded.y, width: bounded.width, height: bounded.height } : c)
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
        const bounded = clampRectToStage(newX, newY, c.width ?? DEFAULT_COMP_W, c.height ?? DEFAULT_COMP_H);
        return { ...c, x: bounded.x, y: bounded.y };
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

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as Scene;
          if (!Array.isArray(data.components)) {
            alert('Fichier JSON invalide : aucune liste de composantes trouvée.');
            return;
          }
          pushHistory();
          setComponents(data.components);
          if (data.name) setSceneName(data.name);
          dispatch({ type: 'SAVE_SCENE', scene: data });
          dispatch({ type: 'SET_ACTIVE_SCENE', id: data.id });
        } catch {
          alert('Erreur lors de la lecture du fichier JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
    <div className="grid h-screen overflow-hidden" style={{ gridTemplateColumns: '240px 1fr', gridTemplateRows: 'auto 1fr' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <Headbar
        sceneName={sceneName}
        onSceneNameChange={setSceneName}
        onResetCamera={resetCamera}
        scale={scale}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(s => !s)}
        snapToGrid={snapToGrid}
        onToggleSnapToGrid={() => setSnapToGrid(s => !s)}
        onExport={handleExport}
        onGoToTimeline={handleGoToTimeline}
        onReset={resetAllComponents}
        onImport={handleImport}
      />

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <Sidebar
        paletteKinds={PALETTE_KINDS}
        onPaletteDragStart={handlePaletteDragStart}
        
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
        className="relative overflow-hidden bg-slate-700"
        style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
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
          <RenderComponents
            components={components}
            selectedId={selectedId}
            showName={true}
            onSelectComponent={setSelectedId}
            onStartDrag={startCompDrag}
            onStartResize={startResize}
            onBringForward={bringForward}
            onBringBackward={bringBackward}
            onRemoveComponent={removeComponent}
          />
        </div>
      </main>
    </div>
  );
}