import { useRef, useState, type ChangeEvent } from 'react';
import { ComponentIcon } from '../components/ComponentIcon';
import { useAppStore }    from '../store/AppContext';
import {
  ACTIONS_REQUIRING_FILE,
  KIND_ACTIONS,
  KIND_LABELS,
  type PlacedComponent,
  type TimelineStep,
  type Timeline,
} from '../types';

// =============================================================================
// TimelineEditorPage
//
// Lets the user build an ordered sequence of stage actions (a "timeline").
//
// Layout:
//   ┌───────────────────────────────────────────┐
//   │  Stage view (read-only)                   │  ← click a component to
//   │  Components are clickable buttons          │    select it
//   │  Action picker appears when one is clicked │
//   ├───────────────────────────────────────────┤
//   │  Timeline panel                           │  ← list of steps; can add
//   │  ☰  [name input]  + Attente  Save  🍓 Pi  │    wait steps too
//   │  1. Lumière 1 → ON                        │
//   │  2. ⏱  Attente  3 s                       │
//   │  …                                        │
//   └───────────────────────────────────────────┘
//
// Workflow:
//   1. User clicks a component on the stage  → action picker appears.
//   2. User picks an action (e.g. ON, PLAY)  → step is appended to the list.
//   3. User can also click "+ Attente"        → enter seconds → append wait step.
//   4. "Sauvegarder" saves to global state   (also persisted in localStorage).
//   5. "🍓 Envoyer au Pi" POSTs to the NestJS backend which forwards to the Pi.
// =============================================================================

export function TimelineEditorPage() {
  const { state, dispatch } = useAppStore();

  // The scene that was built and saved in the Scene Editor
  const scene = state.scenes.find(s => s.id === state.activeSceneId);

  // Restore an existing timeline if one was previously saved for this session
  const existingTimeline = state.timelines.find(t => t.id === state.activeTimelineId);

  const [timelineName, setTimelineName] = useState<string>(existingTimeline?.name  ?? 'Ma timeline');
  const [steps,        setSteps]        = useState<TimelineStep[]>(existingTimeline?.steps ?? []);

  // The component the user clicked on the stage (null = nothing selected)
  const [selectedComp,  setSelectedComp]  = useState<PlacedComponent | null>(null);

  // Controls for the wait-step duration input
  const [showWaitInput, setShowWaitInput] = useState<boolean>(false);
  const [waitSeconds,   setWaitSeconds]   = useState<number>(5);

  // When the user picks a file-requiring action (SHOW or PLAY), we store the
  // pending component + action here, then trigger the hidden file input.
  const [pendingAction, setPendingAction] = useState<{ comp: PlacedComponent; action: string } | null>(null);

  // Maps step IDs → actual File objects (cannot be stored in localStorage)
  const fileStore    = useRef<Map<string, File>>(new Map());
  // Reference to the hidden <input type="file"> triggered programmatically
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step management ────────────────────────────────────────────────────────

  /**
   * Called when the user clicks an action button in the action picker.
   * - Actions like SHOW (projector) and PLAY (speaker) require an attached file:
   *   we save the pending intent, close the picker, and open the file browser.
   * - All other actions add a step immediately.
   */
  function addActionStep(action: string) {
    if (!selectedComp) return;

    const fileReq = ACTIONS_REQUIRING_FILE[action];
    if (fileReq) {
      // Store the intent; the step will be created once the user picks a file
      setPendingAction({ comp: selectedComp, action });
      setSelectedComp(null);
      if (fileInputRef.current) {
        fileInputRef.current.accept = fileReq.accept; // 'image/*' or 'audio/*'
        fileInputRef.current.click();
      }
      return;
    }

    const step: TimelineStep = {
      id:          `step-${Date.now()}`,
      type:        'action',
      componentId: selectedComp.id,
      action,
    };
    setSteps(prev => [...prev, step]);
    setSelectedComp(null);
  }

  /**
   * Called when the user picks a file in the hidden file input.
   * Creates the pending action step and stores the File for later ZIP assembly.
   */
  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingAction) return;

    const { comp, action } = pendingAction;
    const folder   = ACTIONS_REQUIRING_FILE[action].folder;       // 'images' | 'sounds'
    const ext      = file.name.split('.').pop() ?? 'bin';
    const fileName = `${folder}/${comp.id}-${Date.now()}.${ext}`; // path inside the ZIP

    const stepId = `step-${Date.now()}`;
    fileStore.current.set(stepId, file); // keep the real File for ZIP building

    const step: TimelineStep = {
      id:               stepId,
      type:             'action',
      componentId:      comp.id,
      action,
      attachedFileName: fileName,
    };
    setSteps(prev => [...prev, step]);
    setPendingAction(null);
    e.target.value = ''; // reset so the same file can be chosen again
  }

  /** Appends a wait (pause) step of the configured duration */
  function addWaitStep() {
    const step: TimelineStep = {
      id:     `step-${Date.now()}`,
      type:   'wait',
      waitMs: waitSeconds * 1000,
    };
    setSteps(prev => [...prev, step]);
    setShowWaitInput(false);
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  // ── Save / Send ────────────────────────────────────────────────────────────

  /** Assembles the current editor state into a Timeline object */
  function buildTimeline(): Timeline {
    return {
      id:      existingTimeline?.id ?? `timeline-${Date.now()}`,
      name:    timelineName,
      sceneId: scene?.id ?? '',
      steps,
    };
  }

  function handleSave() {
    const timeline = buildTimeline();
    dispatch({ type: 'SAVE_TIMELINE',       timeline });
    dispatch({ type: 'SET_ACTIVE_TIMELINE', id: timeline.id });
    alert(`✅  Timeline "${timelineName}" sauvegardée !`);
  }

  /**
   * Builds a ZIP archive and POSTs it to the NestJS backend.
   *
   * ZIP structure:
   *   timeline.json            ← scene + ordered steps (with attachedFileName paths)
   *   images/<comp>-<ts>.ext   ← one file per SHOW step on a Projector
   *   sounds/<comp>-<ts>.ext   ← one file per PLAY step on a Speaker
   *
   * The backend saves the ZIP as uploads/timeline.zip.
   * The Raspberry Pi can download it via GET /timeline/download.
   */
  async function handleSendToPi() {
    if (!scene) {
      alert("Aucune scène chargée. Retourne dans l'éditeur de scène.");
      return;
    }

    const timeline = buildTimeline();

    try {
      // jszip is loaded lazily — only when the button is actually pressed
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      // 1. Root manifest
      zip.file('timeline.json', JSON.stringify({ scene, timeline }, null, 2));

      // 2. Attached media (images + sounds)
      for (const step of timeline.steps) {
        if (step.type === 'action' && step.attachedFileName) {
          const file = fileStore.current.get(step.id);
          if (file) {
            // attachedFileName already contains the subfolder, e.g. "images/proj-123.jpg"
            zip.file(step.attachedFileName, file);
          }
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const form = new FormData();
      form.append('file', blob, 'timeline.zip');

      // No Content-Type header — the browser sets the correct multipart boundary
      const res = await fetch('http://localhost:3000/timeline/send', {
        method: 'POST',
        body:   form,
      });

      if (res.ok) {
        alert('🍓  Timeline envoyée au Raspberry Pi !');
      } else {
        alert(`Erreur ${res.status} du serveur.`);
      }
    } catch (err) {
      console.error(err);
      alert(
        "Impossible d'envoyer la timeline.\n" +
        'Vérifie que le serveur NestJS est démarré (port 3000).'
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns a human-readable description for any timeline step */
  function stepLabel(step: TimelineStep): string {
    if (step.type === 'wait') {
      return `⏱  Attente  ${step.waitMs / 1000} s`;
    }
    const comp   = scene?.components.find(c => c.id === step.componentId);
    const name   = comp ? comp.name : `(id: ${step.componentId})`;
    // Show just the filename (without folder prefix) when a file is attached
    const attach = step.attachedFileName
      ? `  📎 ${step.attachedFileName.split('/').pop()}`
      : '';
    return `${name}  →  ${step.action}${attach}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="timeline-editor">

      {/* ── Stage view (upper half) ──────────────────────────────────── */}
      <section className="stage-view">

        {/* Button to go back and edit the scene layout */}
        <button
          className="btn btn-outline modify-scene-btn"
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'scene-editor' })}
        >
          ← Modifier la scène
        </button>

        {/* Stage frame with decorative border lights on all four sides */}
        <div className="stage-frame">
          <div className="border-lights top">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="b-light" />)}
          </div>
          <div className="border-lights bottom">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="b-light" />)}
          </div>
          <div className="border-lights left">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="b-light" />)}
          </div>
          <div className="border-lights right">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="b-light" />)}
          </div>

          {/* Stage floor — components are rendered as clickable <button> elements */}
          <div className="stage-floor">
            {(!scene || scene.components.length === 0) && (
              <p className="stage-empty">
                Aucune composante. Retourne dans l'éditeur de scène pour en ajouter.
              </p>
            )}

            {scene?.components.map(comp => (
              <button
                key={comp.id}
                className={`stage-comp-btn ${selectedComp?.id === comp.id ? 'selected' : ''}`}
                style={{ left: `${comp.x}%`, top: `${comp.y}%` }}
                // Clicking again on the selected component deselects it
                onClick={() => setSelectedComp(selectedComp?.id === comp.id ? null : comp)}
                title={`${comp.name} (${KIND_LABELS[comp.kind]}) — cliquer pour ajouter une action`}
              >
                <ComponentIcon kind={comp.kind} size={40} />
                <span>{comp.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action picker — floats at the bottom when a component is selected */}
        {selectedComp && (
          <div className="action-picker">
            <strong>{selectedComp.name}</strong>
            <span className="picker-sep">—</span>
            <span>Action :</span>
            {KIND_ACTIONS[selectedComp.kind].map(action => (
              <button
                key={action}
                className="btn btn-action"
                onClick={() => addActionStep(action)}
              >
                {action}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={() => setSelectedComp(null)}>
              Annuler
            </button>
          </div>
        )}

      </section>

      {/* ── Timeline panel (lower half) ──────────────────────────────── */}
      <section className="timeline-panel">

        {/* Header row: name input + all action buttons */}
        <div className="timeline-header">
          <span className="tl-icon">☰</span>
          <input
            className="tl-name-input"
            value={timelineName}
            onChange={e => setTimelineName(e.target.value)}
            placeholder="Nom de la timeline..."
          />
          <button className="btn btn-sm" onClick={() => setShowWaitInput(v => !v)}>
            + Attente
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleSave}>
            Sauvegarder
          </button>
          <button className="btn btn-sm btn-raspberry" onClick={handleSendToPi}>
            🍓 Envoyer au Pi
          </button>
        </div>

        {/* Wait duration input — toggled by the "+ Attente" button */}
        {showWaitInput && (
          <div className="wait-row">
            <label htmlFor="wait-secs">Durée :</label>
            <input
              id="wait-secs"
              type="number"
              min={1}
              value={waitSeconds}
              onChange={e => setWaitSeconds(Number(e.target.value))}
            />
            <span>secondes</span>
            <button className="btn btn-sm btn-primary" onClick={addWaitStep}>
              Ajouter
            </button>
          </div>
        )}

        {/* Ordered list of timeline steps */}
        <div className="steps-list">
          {steps.length === 0 && (
            <p className="steps-empty">
              Clique sur une composante dans la scène ci-dessus pour ajouter une action.
            </p>
          )}

          {steps.map((step, index) => (
            <div key={step.id} className="step-card">
              <span className="step-num">{index + 1}</span>
              <span className="step-lbl">{stepLabel(step)}</span>
              <button
                className="step-del"
                onClick={() => removeStep(step.id)}
                title="Supprimer cette étape"
              >
                ×
              </button>
            </div>
          ))}
        </div>

      </section>
      {/* Hidden file input — clicked programmatically when SHOW or PLAY is selected */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />

    </div>
  );
}
