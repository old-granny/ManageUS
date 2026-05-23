import { useState, useRef } from 'react';
import { ComponentIcon } from '../components/ComponentIcon';
import { useAppStore }    from '../store/AppContext';
import { KIND_LABELS, type PlacedComponent, type ComponentKind, type Scene } from '../types';

// =============================================================================
// SceneEditorPage
//
// Lets the user build a stage layout by dragging component icons from the
// left sidebar onto the stage canvas.
//
// Layout:
//   ┌─────────────────────────────────────────────┐
//   │  Top bar (scene name input)                 │  ← full width
//   ├──────────────┬──────────────────────────────┤
//   │  Sidebar     │  Stage canvas                │
//   │  (palette)   │  (wood-floor drop target)    │
//   └──────────────┴──────────────────────────────┘
//
// Drag-and-drop uses the native HTML5 API (no external library needed):
//   1. Palette items set `draggable` and call onDragStart.
//   2. The canvas calls onDragOver (preventDefault → allows drop) + onDrop.
//   3. On drop, cursor position is converted to a % of canvas size and saved.
// =============================================================================

/** Component kinds shown in the sidebar palette */
const PALETTE_KINDS: ComponentKind[] = ['light', 'speaker', 'projector', 'curtain'];

/** Generates a unique ID that is safe even across page reloads */
function generateId(kind: ComponentKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export function SceneEditorPage() {
  const { state, dispatch } = useAppStore();

  // Restore the previously active scene so edits are preserved across navigation
  const activeScene = state.scenes.find(s => s.id === state.activeSceneId);

  const [sceneName,  setSceneName]  = useState<string>(activeScene?.name ?? 'Ma scène');
  const [components, setComponents] = useState<PlacedComponent[]>(activeScene?.components ?? []);

  // Stores which palette kind is being dragged (set in onDragStart, read in onDrop)
  const draggingKind = useRef<ComponentKind | null>(null);

  // DOM ref to the stage canvas — needed to compute percentage drop coordinates
  const stageRef = useRef<HTMLDivElement>(null);

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  function handlePaletteDragStart(kind: ComponentKind) {
    draggingKind.current = kind;
  }

  function handleStageDragOver(e: React.DragEvent<HTMLDivElement>) {
    // Must preventDefault to signal this element accepts drops
    e.preventDefault();
  }

  function handleStageDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const kind = draggingKind.current;
    if (!kind || !stageRef.current) return;

    // Convert the cursor's absolute pixel position to a % of the canvas.
    // Using percentages makes the layout resolution-independent.
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left)  / rect.width)  * 100;
    const y = ((e.clientY - rect.top)   / rect.height) * 100;

    // Auto-number the new component (e.g. "Lumière 2")
    const count = components.filter(c => c.kind === kind).length + 1;

    const placed: PlacedComponent = {
      id:   generateId(kind),
      kind,
      name: `${KIND_LABELS[kind]} ${count}`,
      // Clamp to keep the icon centre inside the canvas boundaries
      x: Math.min(95, Math.max(2, x)),
      y: Math.min(95, Math.max(2, y)),
    };

    setComponents(prev => [...prev, placed]);
    draggingKind.current = null;
  }

  // ── Scene actions ───────────────────────────────────────────────────────────

  function removeComponent(id: string) {
    setComponents(prev => prev.filter(c => c.id !== id));
  }

  /** Assembles the current editor state into a Scene object */
  function buildScene(): Scene {
    return {
      id:         activeScene?.id ?? `scene-${Date.now()}`,
      name:       sceneName,
      components,
    };
  }

  function handleSave() {
    const scene = buildScene();
    dispatch({ type: 'SAVE_SCENE',       scene  });
    dispatch({ type: 'SET_ACTIVE_SCENE', id: scene.id });
    alert(`✅  Scène "${sceneName}" sauvegardée !`);
  }

  /** Downloads the scene as a .json file */
  function handleExport() {
    const scene = buildScene();
    const blob  = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `${sceneName.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Saves the scene then navigates to the Timeline Editor */
  function handleGoToTimeline() {
    const scene = buildScene();
    dispatch({ type: 'SAVE_SCENE',       scene  });
    dispatch({ type: 'SET_ACTIVE_SCENE', id: scene.id });
    dispatch({ type: 'SET_PAGE',         page: 'timeline-editor' });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="scene-editor">

      {/* ── Top bar: scene name input ─────────────────────────────── */}
      <header className="scene-topbar">
        <span className="topbar-logo">🎭 Graphicus</span>
        <label htmlFor="scene-name">Scène :</label>
        <input
          id="scene-name"
          value={sceneName}
          onChange={e => setSceneName(e.target.value)}
          placeholder="Nom de la scène..."
        />
      </header>

      {/* ── Left sidebar: draggable component palette ─────────────── */}
      <aside className="palette">
        <p className="palette-title">Composantes</p>

        {PALETTE_KINDS.map(kind => (
          <div
            key={kind}
            className="palette-item"
            draggable
            onDragStart={() => handlePaletteDragStart(kind)}
            title={`Glisser un(e) ${KIND_LABELS[kind]} sur la scène`}
          >
            <ComponentIcon kind={kind} size={64} />
            <span>{KIND_LABELS[kind]}</span>
          </div>
        ))}

        {/* Spacer pushes the buttons to the bottom of the sidebar */}
        <div className="palette-spacer" />

        <button className="btn btn-outline"   onClick={handleExport}>Export scene</button>
        <button className="btn btn-primary"   onClick={handleSave}>Save scene</button>
        <button className="btn btn-secondary" onClick={handleGoToTimeline}>Timeline →</button>
      </aside>

      {/* ── Stage canvas: wood-floor drop target ──────────────────── */}
      <main
        className="stage-canvas"
        ref={stageRef}
        onDragOver={handleStageDragOver}
        onDrop={handleStageDrop}
      >
        {/* Hint text shown when no component has been placed yet */}
        {components.length === 0 && (
          <p className="stage-hint">Glisser des composantes ici</p>
        )}

        {/* Each placed component is positioned absolutely using its saved x/y % */}
        {components.map(comp => (
          <div
            key={comp.id}
            className="placed-comp"
            style={{ left: `${comp.x}%`, top: `${comp.y}%` }}
            title={comp.name}
          >
            <ComponentIcon kind={comp.kind} size={48} />
            <span className="comp-name">{comp.name}</span>
            {/* × remove button — hidden via CSS until the user hovers */}
            <button
              className="comp-remove"
              onClick={() => removeComponent(comp.id)}
              title="Retirer de la scène"
            >
              ×
            </button>
          </div>
        ))}
      </main>

    </div>
  );
}
