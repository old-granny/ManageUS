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
import { exportTimelineZip } from '../utils/exportZip';

export function TimelineEditorPage() {
  const { state, dispatch } = useAppStore();

  const scene            = state.scenes.find(s => s.id === state.activeSceneId);
  const existingTimeline = state.timelines.find(t => t.id === state.activeTimelineId);

  const [timelineName] = useState<string>(existingTimeline?.name ?? 'Ma timeline');
  const [steps, setSteps]               = useState<TimelineStep[]>(existingTimeline?.steps ?? []);
  const [selectedComps, setSelectedComps] = useState<PlacedComponent[]>([]);

  // Live playback state bubbled up from TrackCreatorTimeLine
  const [liveIsPlaying,      setLiveIsPlaying]      = useState(false);
  const [liveCompStates,     setLiveCompStates]      = useState<Map<string, string>>(new Map());

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
    const index = tracks.findIndex(t => t.id === id);
    const remaining = tracks.filter(t => t.id !== id);

    if (remaining.length > 0) {
      // Déterminer la piste de repli : 
      // Si on supprime l'index 0, on prend le nouveau index 0.
      // Si on supprime une piste > 0, on prend la piste précédente (index - 1).
      const newIndex = index > 0 ? index - 1 : 0;
      const fallbackId = remaining[newIndex].id;

      // On déplace les étapes vers la piste de repli
      setSteps(prev => prev.map(s => 
        s.trackId === id ? ({ ...s, trackId: fallbackId } as TimelineStep) : s
      ));
      
      // Mise à jour de la sélection
      if (selectedTrackId === id) {
        setSelectedTrackId(fallbackId);
      }
    }

    setTracks(remaining);
  }

  function moveStepToTrack(stepId: string, toTrackId: string) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, trackId: toTrackId } as TimelineStep : s));
  }

  // NOUVEAU: Permet d'ajouter/retirer un objet de la sélection multiple
  function toggleCompSelection(comp: PlacedComponent) {
    setSelectedComps(prev => {
      if (prev.some(c => c.id === comp.id)) return prev.filter(c => c.id !== comp.id);
      return [...prev, comp];
    });
  }

  function deselectComp(id: string) {
    setSelectedComps(prev => prev.filter(c => c.id !== id));
  }

  // NOUVEAU: Crée un bloc standard (si 1 objet) ou un bloc groupé (si plusieurs)
  function addBlockStep(actions: { componentId: string; action: string }[]) {
    if (actions.length === 0) return;

    if (actions.length === 1) {
      const actionName = actions[0].action;
      const fileReq = ACTIONS_REQUIRING_FILE[actionName];
      if (fileReq) {
        const comp = selectedComps.find(c => c.id === actions[0].componentId)!;
        setPendingAction({ comp, action: actionName });
        setSelectedComps([]);
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
        componentId: actions[0].componentId,
        action: actionName,
      };
      setSteps(prev => [...prev, step]);
      setSelectedComps([]);
      return;
    }

    // Création du bloc groupé
    const step: TimelineStep = {
      id: `step-${Date.now()}`,
      type: 'group',
      trackId: selectedTrackId,
      actions: actions,
    };
    setSteps(prev => [...prev, step]);
    setSelectedComps([]);
  }

  function bumpToNewTrack(stepId: string) {
    const newId = `track-${Date.now()}`;
    setTracks(prev => [...prev, { id: newId, name: `Track ${prev.length + 1}` }]);
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, trackId: newId } as TimelineStep : s));
  }

  /** Compute the end-time of the last step in a given track (to place new steps after it) */
  function nextOffset(trackId: string): number {
    return steps
      .filter(s => (s.trackId ?? 'track-1') === trackId)
      .reduce((max, s) => Math.max(max, (s.startOffset ?? 0) + (s.duration ?? 1)), 0);
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
      startOffset: nextOffset(selectedTrackId),
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
    exportTimelineZip(timeline, scene, fileStore.current, timelineName)
      .catch(err => console.error('ZIP export failed:', err));
  }

  async function handleUpload(): Promise<void> {
    const timeline = buildTimeline();
    await exportTimelineZip(timeline, scene, fileStore.current, timelineName, { download: false });
  }


  return (
    <div className="timeline-editor">

      <HeadbarTimeLine onSave={handleSave} onUpload={handleUpload} onGoToSceneEditor={() => dispatch({ type: 'SET_PAGE', page: 'scene-editor' })}/>

      <div className="timeline-middle">
        <ObjectCreatorTimeLine
          selectedComps={selectedComps}
          activeTrackName={tracks.find(t => t.id === selectedTrackId)?.name ?? '—'}
          onAddBlock={addBlockStep}
          onDeselectComp={deselectComp}
        />
        <SceneCreatorTimeLine
          scene={scene}
          selectedComps={selectedComps}
          onToggleComp={toggleCompSelection}
          isPlaying={liveIsPlaying}
          componentStates={liveCompStates}
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
        onBumpToNewTrack={bumpToNewTrack}
        onPlaybackChange={(playing, states) => {
          setLiveIsPlaying(playing);
          setLiveCompStates(states);
        }}
      />

      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChosen} />
    </div>
  );
}