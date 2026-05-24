import type { ComponentKind } from '../types';
import { ComponentIcon } from './ComponentIcon';
import { KIND_LABELS } from '../types';

interface SidebarProps {
  paletteKinds: ComponentKind[];
  onPaletteDragStart: (kind: ComponentKind) => void;
  onExport: () => void;
  onSave: () => void;
  onGoToTimeline: () => void;
  onReset: () => void;
}

export function Sidebar({ paletteKinds, onPaletteDragStart, onExport, onSave, onGoToTimeline, onReset }: SidebarProps) {
  return (
    <aside className="palette">
      <p className="palette-title">Composantes</p>
      {paletteKinds.map(kind => (
        <div
          key={kind}
          className="palette-item"
          draggable
          onDragStart={() => onPaletteDragStart(kind)}
          title={`Glisser un(e) ${KIND_LABELS[kind]} sur la scène`}
        >
          <ComponentIcon kind={kind} size={64} />
          <span>{KIND_LABELS[kind]}</span>
        </div>
      ))}
      <div className="palette-spacer" />
      <small style={{ color: '#aaa', padding: '10px', textAlign: 'center', fontSize: '11px' }}>
        Clic-Droit + Glisser pour naviguer sur la scène infinie.<br />
        Molette pour Zoomer / Dézoomer.
      </small>
      <button className="btn btn-secondary" onClick={onReset}>Reset</button>
      <button className="btn btn-outline" onClick={onExport}>Export scene</button>
      <button className="btn btn-primary" onClick={onSave}>Save scene</button>
      <button className="btn btn-secondary" onClick={onGoToTimeline}>Timeline →</button>
    </aside>
  );
}