import { useState, useEffect } from 'react';
import { KIND_ACTIONS, type PlacedComponent } from '../../types';

interface ObjectCreatorTimeLineProps {
  selectedComps:    PlacedComponent[];
  activeTrackName:  string;
  onAddBlock:       (actions: { componentId: string; action: string }[]) => void;
  onDeselectComp:   (id: string) => void;
}

export function ObjectCreatorTimeLine({
  selectedComps,
  activeTrackName,
  onAddBlock,
  onDeselectComp,
}: ObjectCreatorTimeLineProps) {
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({});

  // Sélectionne par défaut la première action disponible pour chaque nouvel objet
  useEffect(() => {
    const newActions = { ...selectedActions };
    let changed = false;
    selectedComps.forEach(comp => {
      if (!newActions[comp.id]) {
        newActions[comp.id] = KIND_ACTIONS[comp.kind][0];
        changed = true;
      }
    });
    if (changed) setSelectedActions(newActions);
  }, [selectedComps]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleActionToggle = (compId: string, action: string) => {
    setSelectedActions(prev => ({ ...prev, [compId]: action }));
  };

  const handleCreateBlock = () => {
    const actionsToGroup = selectedComps.map(comp => ({
      componentId: comp.id,
      action: selectedActions[comp.id]
    }));
    onAddBlock(actionsToGroup);
    setSelectedActions({});
  };

  return (
    <aside className="component-creator-panel">
      <div className="creator-card">
        <h3 style={{ marginBottom: '10px' }}>Component Creator</h3>

        <p style={{ fontSize: 11, color: '#64748b', marginBottom: '10px' }}>
          Piste active : <strong style={{ color: '#93c5fd' }}>{activeTrackName}</strong>
        </p>

        {/* Zone Scrollable des composants sélectionnés */}
        <div className="creator-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {selectedComps.length === 0 ? (
            <p className="subtitle" style={{ margin: 'auto' }}>
              Clique sur un ou plusieurs objets<br />dans la scène
            </p>
          ) : (
            selectedComps.map(comp => (
              <div key={comp.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '12px' }}>{comp.name}</strong>
                  <button className="step-del" style={{ position: 'relative', right: 0 }} onClick={() => onDeselectComp(comp.id)}>×</button>
                </div>
                <div className="action-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-start' }}>
                  {KIND_ACTIONS[comp.kind].map(action => {
                    const isActive = selectedActions[comp.id] === action;
                    return (
                      <button
                        key={action}
                        className={`btn btn-sm ${isActive ? 'btn-action' : 'btn-outline'}`}
                        style={!isActive ? { color: '#94a3b8', borderColor: '#475569' } : {}}
                        onClick={() => handleActionToggle(comp.id, action)}
                      >
                        {action}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bouton pour générer le bloc combiné */}
        {selectedComps.length > 0 && (
          <button className="btn btn-action" style={{ marginTop: '12px', padding: '10px', width: '100%', flexShrink: 0 }} onClick={handleCreateBlock}>
            {selectedComps.length > 1 ? 'Créer le bloc groupé' : 'Ajouter à la timeline'}
          </button>
        )}
      </div>
    </aside>
  );
}