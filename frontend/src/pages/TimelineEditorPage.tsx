import { useRef, useState, type ChangeEvent } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  ACTIONS_REQUIRING_FILE,
  type PlacedComponent,
  type TimelineStep,
  type Timeline,
} from '../types';
import { ObjectCreatorTimeLine } from '../components/ObjectCreatorTimeLine';
import { SceneCreatorTimeLine }  from '../components/SceneCreatorTimeLine';
import { TrackCreatorTimeLine }  from '../components/TrackCreatorTimeLine';

export function TimelineEditorPage() {
  const { state, dispatch } = useAppStore();

  const scene            = state.scenes.find(s => s.id === state.activeSceneId);
  const existingTimeline = state.timelines.find(t => t.id === state.activeTimelineId);

  // â”€â”€ Shared state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [timelineName] = useState<string>(existingTimeline?.name ?? 'Ma timeline');
  const [steps, setSteps]               = useState<TimelineStep[]>(existingTimeline?.steps ?? []);
  const [selectedComp, setSelectedComp] = useState<PlacedComponent | null>(null);

  const [pendingAction, setPendingAction] = useState<{ comp: PlacedComponent; action: string } | null>(null);
  const fileStore    = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks]               = useState<{ id: string; name: string }[]>([{ id: 'track-1', name: 'Track 1' }]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-1');

  // â”€â”€ Track management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function addTrack() {
    const newId = `track-${Date.now()}`;
    setTracks(prev => [...prev, { id: newId, name: `Track ${prev.length + 1}` }]);
  }

  function removeTrack(id: string) {
    const remaining = tracks.filter(t => t.id !== id);
    if (remaining.length > 0) {
      const fallbackId = remaining[0].id;
      setSteps(prev => prev.map(s => s.trackId === id ? { ...s, trackId: fallbackId } : s));
    }
    setTracks(remaining);
    if (selectedTrackId === id && remaining.length > 0) setSelectedTrackId(remaining[0].id);
  }

  function moveStepToTrack(stepId: string, toTrackId: string) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, trackId: toTrackId } : s));
  }

  // â”€â”€ Step management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      trackId: selectedTrackId,
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
    const folder   = ACTIONS_REQUIRING_FILE[action].folder;
    const ext      = file.name.split('.').pop() ?? 'bin';
    const fileName = `${folder}/${comp.id}-${Date.now()}.${ext}`;
    const stepId   = `step-${Date.now()}`;

    fileStore.current.set(stepId, file);
    const step: TimelineStep = {
      id: stepId,
      type: 'action',
      trackId: selectedTrackId,
      componentId: comp.id,
      action,
      attachedFileName: fileName,
    };
    setSteps(prev => [...prev, step]);
    setPendingAction(null);
    e.target.value = '';
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

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
    dispatch({ type: 'SAVE_TIMELINE', timeline });
    dispatch({ type: 'SET_ACTIVE_TIMELINE', id: timeline.id });
    alert(`âœ… Timeline "${timelineName}" sauvegardÃ©e !`);
  }

  async function handleSendToPi() {
    if (!scene) { alert("Aucune scÃ¨ne chargÃ©e."); return; }

    const timeline = buildTimeline();
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file('timeline.json', JSON.stringify({ scene, timeline }, null, 2));
      for (const step of timeline.steps) {
        if (step.type === 'action' && step.attachedFileName) {
          const f = fileStore.current.get(step.id);
          if (f) zip.file(step.attachedFileName, f);
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const form = new FormData();
      form.append('file', blob, 'timeline.zip');
      const res = await fetch('http://localhost:3000/timeline/send', { method: 'POST', body: form });
      if (res.ok) alert('Timeline envoyÃ©e au Raspberry Pi !');
      else alert(`Erreur ${res.status} du serveur.`);
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer la timeline.\nVÃ©rifie que le serveur NestJS est dÃ©marrÃ©.");
    }
  }

  return (
    <div className="timeline-editor">

      {/* Top bar */}
      <header className="scene-topbar">
        <div className="topbar-links">
          <button className="topbar-link" onClick={handleSave}>Sauvegarder</button>
          <button className="topbar-link" onClick={handleSendToPi}>Envoyer au Pi</button>
          <button
            className="topbar-link"
            onClick={() => dispatch({ type: 'SET_PAGE', page: 'scene-editor' })}
          >
            Modifier la scene
          </button>
        </div>
        <div className="topbar-avatar" />
      </header>

      {/* Middle: object creator + scene viewer */}
      <div className="timeline-middle">
        <ObjectCreatorTimeLine
          selectedComp={selectedComp}
          activeTrackName={tracks.find(t => t.id === selectedTrackId)?.name ?? 'â€”'}
          onAddAction={addActionStep}
          onCancel={() => setSelectedComp(null)}
        />
        <SceneCreatorTimeLine
          scene={scene}
          selectedComp={selectedComp}
          onSelectComp={setSelectedComp}
        />
      </div>

      {/* Bottom: timeline tracks */}
      <TrackCreatorTimeLine
        tracks={tracks}
        selectedTrackId={selectedTrackId}
        steps={steps}
        sceneComponents={scene?.components ?? []}
        onSelectTrack={setSelectedTrackId}
        onAddTrack={addTrack}
        onRemoveTrack={removeTrack}
        onMoveStep={moveStepToTrack}
        onRemoveStep={removeStep}
      />

      {/* Hidden file input for media attachments */}
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChosen} />
    </div>
  );
}
