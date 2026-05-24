import { useRef, useState, type ChangeEvent } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  ACTIONS_REQUIRING_FILE,
  type PlacedComponent,
  type TimelineStep,
  type Timeline,
} from '../types';
import { ObjectCreatorTimeLine } from '../components/Timeline/ObjectCreatorTimeLine';
import { SceneCreatorTimeLine }  from '../components/Timeline/SceneCreatorTimeLine';
import { TrackCreatorTimeLine }  from '../components/Timeline/TrackCreatorTimeLine';
import { HeadbarTimeLine } from '../components/Timeline/headbar';

export function TimelineEditorPage() {
  const { state, dispatch } = useAppStore();

  const scene            = state.scenes.find(s => s.id === state.activeSceneId);
  const existingTimeline = state.timelines.find(t => t.id === state.activeTimelineId);

  const [timelineName] = useState<string>(existingTimeline?.name ?? 'Ma timeline');
  const [steps, setSteps]               = useState<TimelineStep[]>(existingTimeline?.steps ?? []);
  const [selectedComp, setSelectedComp] = useState<PlacedComponent | null>(null);

  const [pendingAction, setPendingAction] = useState<{ comp: PlacedComponent; action: string } | null>(null);
  const fileStore    = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tracks, setTracks]               = useState<{ id: string; name: string }[]>([{ id: 'track-1', name: 'Track 1' }]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-1');

  function addTrack() {
    const newId = `track-${Date.now()}`;
    setTracks(prev => [...prev, { id: newId, name: `Track ${prev.length + 1}` }]);
    setSelectedTrackId(newId); // NOUVEAU : Sélectionne automatiquement la nouvelle piste
  }

  function removeTrack(id: string) {
    const remaining = tracks.filter(t => t.id !== id);
    if (remaining.length > 0) {
      const fallbackId = remaining[0].id;
      setSteps(prev => prev.map(s => s.trackId === id ? { ...s, trackId: fallbackId } as TimelineStep : s));
    }
    setTracks(remaining);
    if (selectedTrackId === id && remaining.length > 0) setSelectedTrackId(remaining[0].id);
  }

  function moveStepToTrack(stepId: string, toTrackId: string) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, trackId: toTrackId } as TimelineStep : s));
  }

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

  function updateStep(id: string, updates: Record<string, any>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } as TimelineStep : s));
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
    alert(`✅ Timeline "${timelineName}" sauvegardée !`);
  }


  return (
    <div className="timeline-editor">

      <HeadbarTimeLine onSave={handleSave} onGoToSceneEditor={() => dispatch({ type: 'SET_PAGE', page: 'scene-editor' })}/>

      <div className="timeline-middle">
        <ObjectCreatorTimeLine
          selectedComp={selectedComp}
          activeTrackName={tracks.find(t => t.id === selectedTrackId)?.name ?? '—'}
          onAddAction={addActionStep}
          onCancel={() => setSelectedComp(null)}
        />
        <SceneCreatorTimeLine
          scene={scene}
          selectedComp={selectedComp}
          onSelectComp={setSelectedComp}
        />
      </div>

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
        onUpdateStep={updateStep}
      />
      
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChosen} />
    </div>
  );
}