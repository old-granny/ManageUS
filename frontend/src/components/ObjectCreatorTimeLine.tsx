import { KIND_ACTIONS, type PlacedComponent } from '../types';

interface ObjectCreatorTimeLineProps {
  selectedComp:    PlacedComponent | null;
  activeTrackName: string;
  onAddAction:     (action: string) => void;
  onCancel:        () => void;
}

export function ObjectCreatorTimeLine({
  selectedComp,
  activeTrackName,
  onAddAction,
  onCancel,
}: ObjectCreatorTimeLineProps) {
  return (
    <aside className="component-creator-panel">
      <div className="creator-card">
        <h3>Component Creator</h3>

        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
          Piste active :{' '}
          <strong style={{ color: '#93c5fd' }}>{activeTrackName}</strong>
        </p>

        {selectedComp ? (
          <div className="action-picker-inline">
            <p><strong>{selectedComp.name}</strong></p>
            <div className="action-btns">
              {KIND_ACTIONS[selectedComp.kind].map(action => (
                <button
                  key={action}
                  className="btn btn-action"
                  onClick={() => onAddAction(action)}
                >
                  {action}
                </button>
              ))}
              <button className="btn btn-ghost" onClick={onCancel}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="subtitle">
            Clique sur un objet<br />dans la scène
          </p>
        )}
      </div>
    </aside>
  );
}
