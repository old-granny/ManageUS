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
    <aside className="flex flex-col items-center gap-2 py-4 px-2 overflow-y-auto bg-[#1a2a5e] border-r-4 border-black">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/55 w-full text-center">Composantes</p>

      {paletteKinds.map(kind => (
        <div
          key={kind}
          className="flex flex-col items-center gap-1 w-full px-1.5 py-2 rounded-lg cursor-grab select-none hover:bg-white/20 active:cursor-grabbing transition-colors"
          draggable
          onDragStart={() => onPaletteDragStart(kind)}
          title={`Glisser un(e) ${KIND_LABELS[kind]} sur la scène`}
        >
          <ComponentIcon kind={kind} size={48} />
          <span className="text-[11px] text-white/80">{KIND_LABELS[kind]}</span>
        </div>
      ))}

      <div className="flex-1 min-h-2" />

      <p className="text-[10px] text-white/40 text-center leading-relaxed px-2">
        Clic-Droit + Glisser pour naviguer.<br />
        Molette pour zoomer.
      </p>

      <button
        onClick={onReset}
        className="w-full py-1.5 rounded text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
      >
        Reset
      </button>
      <button
        onClick={onExport}
        className="w-full py-1.5 rounded text-xs font-semibold bg-transparent border border-zinc-500 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
      >
        Export scène
      </button>
      <button
        onClick={onSave}
        className="w-full py-1.5 rounded text-xs font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors"
      >
        Sauvegarder
      </button>
      <button
        onClick={onGoToTimeline}
        className="w-full py-1.5 rounded text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
      >
        Timeline →
      </button>
    </aside>
  );
}