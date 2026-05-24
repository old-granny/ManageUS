import { useRef, useState, useEffect, type ChangeEvent } from 'react';
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

export function TimelineEditorPage() {
  const { state, dispatch } = useAppStore();

  const scene = state.scenes.find(s => s.id === state.activeSceneId);
  const existingTimeline = state.timelines.find(t => t.id === state.activeTimelineId);

  const [timelineName, setTimelineName] = useState<string>(existingTimeline?.name ?? 'Ma timeline');
  const [steps, setSteps] = useState<TimelineStep[]>(existingTimeline?.steps ?? []);
  const [selectedComp, setSelectedComp] = useState<PlacedComponent | null>(null);

  const [showWaitInput, setShowWaitInput] = useState<boolean>(false);
  const [waitSeconds, setWaitSeconds] = useState<number>(5);

  const [pendingAction, setPendingAction] = useState<{ comp: PlacedComponent; action: string } | null>(null);

  const fileStore = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Gestion dynamique des pistes
  const [tracks, setTracks] = useState<{ id: string; name: string }[]>([
    { id: 'track-1', name: 'Track 1' },
  ]);

  // Génération des graduations (ex: de 0.0s à 10.0s par pas de 0.2s)
  const graduations = Array.from({ length: 51 }, (_, i) => (i * 0.2).toFixed(1) + 's');

  function addTrack() {
    const newId = `track-${Date.now()}`;
    setTracks(prev => [...prev, { id: newId, name: `Track ${prev.length + 1}` }]);
  }

  function removeTrack(id: string) {
    setTracks(prev => prev.filter(t => t.id !== id));
  }

  // Animation fluide du curseur de lecture (Playhead)
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    function updatePlayhead(time: number) {
      if (!isPlaying) return;
      const delta = (time - lastTime) / 1000; // Converti en secondes
      lastTime = time;
      setCurrentTime(prev => prev + delta);
      animationFrame = requestAnimationFrame(updatePlayhead);
    }

    if (isPlaying) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(updatePlayhead);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  function addActionStep(action: string) {
    if (!selectedComp) return;

    const fileReq = ACTIONS_REQUIRING_FILE[action];
    if (fileReq) {
      setPendingAction({ comp: selectedComp, action });
      setSelectedComp(null);
      if (fileInputRef.current) {
        fileInputRef.current.accept = fileReq.accept;
        fileInputRef.current.click();
      }
      return;
    }

    const step: TimelineStep = {
      id: `step-${Date.now()}`,
      type: 'action',
      componentId: selectedComp.id,
      action,
    };
    setSteps(prev => [...prev, step]);
    setSelectedComp(null);
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingAction) return;

    const { comp, action } = pendingAction;
    const folder = ACTIONS_REQUIRING_FILE[action].folder;
    const ext = file.name.split('.').pop() ?? 'bin';
    const fileName = `${folder}/${comp.id}-${Date.now()}.${ext}`;

    const stepId = `step-${Date.now()}`;
    fileStore.current.set(stepId, file);

    const step: TimelineStep = {
      id: stepId,
      type: 'action',
      componentId: comp.id,
      action,
      attachedFileName: fileName,
    };
    setSteps(prev => [...prev, step]);
    setPendingAction(null);
    e.target.value = '';
  }

  function addWaitStep() {
    const step: TimelineStep = {
      id: `step-${Date.now()}`,
      type: 'wait',
      waitMs: waitSeconds * 1000,
    };
    setSteps(prev => [...prev, step]);
    setShowWaitInput(false);
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function buildTimeline(): Timeline {
    return {
      id: existingTimeline?.id ?? `timeline-${Date.now()}`,
      name: timelineName,
      sceneId: scene?.id ?? '',
      steps,
    };
  }

  function handleSave() {
    const timeline = buildTimeline();
    dispatch({ type: 'SAVE_TIMELINE', timeline });
    dispatch({ type: 'SET_ACTIVE_TIMELINE', id: timeline.id });
    alert(`✅ Timeline "${timelineName}" sauvegardée !`);
  }

  async function handleSendToPi() {
    if (!scene) {
      alert("Aucune scène chargée. Retourne dans l'éditeur de scène.");
      return;
    }

    const timeline = buildTimeline();

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      zip.file('timeline.json', JSON.stringify({ scene, timeline }, null, 2));

      for (const step of timeline.steps) {
        if (step.type === 'action' && step.attachedFileName) {
          const file = fileStore.current.get(step.id);
          if (file) {
            zip.file(step.attachedFileName, file);
          }
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const form = new FormData();
      form.append('file', blob, 'timeline.zip');

      const res = await fetch('http://localhost:3000/timeline/send', {
        method: 'POST',
        body: form,
      });

      if (res.ok) {
        alert('🍓 Timeline envoyée au Raspberry Pi !');
      } else {
        alert(`Erreur ${res.status} du serveur.`);
      }
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer la timeline.\nVérifie que le serveur NestJS est démarré.");
    }
  }

  function stepLabel(step: TimelineStep): string {
    if (step.type === 'wait') {
      return `⏱ ${step.waitMs / 1000}s`;
    }
    const comp = scene?.components.find(c => c.id === step.componentId);
    const name = comp ? comp.name : `ID:${step.componentId}`;
    return `${name} → ${step.action}`;
  }

  return (
    <div className="timeline-editor">
      
      {/* ── Top bar ─────────────────────────────── */}
      <header className="scene-topbar">
        <div className="topbar-links">
          <button className="topbar-link" onClick={handleSave}>Import</button>
          <button className="topbar-link" onClick={handleSendToPi}>Export</button>
          <button 
            className="topbar-link"
            onClick={() => dispatch({ type: 'SET_PAGE', page: 'scene-editor' })}
          >
            Modify scene
          </button>
        </div>
        <div className="topbar-avatar">
          {/* Espace pour l'icône/avatar en haut à droite */}
        </div>
      </header>

      {/* ── Middle Section: Sidebar + Stage ─────────────────────────────── */}
      <div className="timeline-middle">
        
        {/* Panneau latéral gauche */}
        <aside className="component-creator-panel">
          <div className="creator-card">
            <h3>Component Creator</h3>
            {selectedComp ? (
              <div className="action-picker-inline">
                <p><strong>{selectedComp.name}</strong></p>
                <div className="action-btns">
                  {KIND_ACTIONS[selectedComp.kind].map(action => (
                    <button key={action} className="btn btn-action" onClick={() => addActionStep(action)}>
                      {action}
                    </button>
                  ))}
                  <button className="btn btn-ghost" onClick={() => setSelectedComp(null)}>Annuler</button>
                </div>
              </div>
            ) : (
              <p className="subtitle">Select an object in<br/>the scene</p>
            )}
          </div>
        </aside>

        {/* Zone de la scène centrale */}
        <section className="stage-view">
          <div className="stage-frame">
            
            {/* Lumières décoratives autour de la bordure bleue */}
            <div className="border-lights top">
              {Array.from({ length: 6 }).map((_, i) => <div key={`t-${i}`} className="b-light" />)}
            </div>
            <div className="border-lights bottom">
              {Array.from({ length: 10 }).map((_, i) => <div key={`b-${i}`} className="b-light" />)}
            </div>
            <div className="border-lights left">
              {Array.from({ length: 4 }).map((_, i) => <div key={`l-${i}`} className="b-light" />)}
            </div>
            <div className="border-lights right">
              {Array.from({ length: 4 }).map((_, i) => <div key={`r-${i}`} className="b-light" />)}
            </div>

            {/* Le plancher gris de la scène au centre */}
            <div className="stage-floor">
              {(!scene || scene.components.length === 0) && (
                <p className="stage-empty">Scène vide.</p>
              )}

              {scene?.components.map(comp => (
                <button
                  key={comp.id}
                  className={`stage-comp-btn ${selectedComp?.id === comp.id ? 'selected' : ''}`}
                  style={{ left: `${comp.x}%`, top: `${comp.y}%` }}
                  onClick={() => setSelectedComp(selectedComp?.id === comp.id ? null : comp)}
                >
                  <ComponentIcon kind={comp.kind} size={40} />
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Timeline Panel ──────────────────────────────────────────────── */}
      <section className="timeline-panel">
        <div className="playback-controls">
          <button className="ctrl-btn play-btn" onClick={() => setIsPlaying(true)}>▶</button>
          <button className="ctrl-btn pause-btn" onClick={() => setIsPlaying(false)}>⏸</button>
          <button className="ctrl-btn stop-btn" onClick={() => { setIsPlaying(false); setCurrentTime(0); }}>⏹</button>
          
          <button className="btn btn-outline btn-add-track" onClick={addTrack}>
            ＋ Add Track
          </button>
        </div>
        
        <div className="timeline-grid-container">
          
          {/* Colonne de gauche : Entêtes des pistes (Fixe) */}
          <div className="timeline-labels-column">
            <div className="ruler-corner-cell">Temps</div>
            {tracks.map(track => (
              <div key={track.id} className="track-label-cell">
                <span>{track.name}</span>
                <button className="track-del-btn" onClick={() => removeTrack(track.id)}>×</button>
              </div>
            ))}
          </div>

          {/* Zone de droite : Échelle de temps et blocs (Scrollable) */}
          <div className="timeline-scrollable-area">
            <div 
              className="playhead-line" 
              style={{ left: `${currentTime * 350}px` }} 
            />
            
            {/* Règle graduée (0.x secondes) */}
            <div className="timeline-ruler-row">
              {graduations.map((time, idx) => (
                <div key={idx} className="ruler-tick-cell">
                  <span className="tick-text">{time}</span>
                  <div className="tick-mark"></div>
                </div>
              ))}
            </div>
            
            {/* Pistes de la timeline */}
            {tracks.map((track, trackIdx) => (
              <div key={track.id} className="timeline-track-data-row">
                {/* Exemple : on place les actions sur la première piste */}
                {trackIdx === 0 ? (
                  steps.map((step) => (
                    <div key={step.id} className="track-block">
                      <span>{stepLabel(step)}</span>
                      <button className="step-del" onClick={() => removeStep(step.id)}>×</button>
                    </div>
                  ))
                ) : (
                  <span className="track-empty-hint"></span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
    </div>
  );
}