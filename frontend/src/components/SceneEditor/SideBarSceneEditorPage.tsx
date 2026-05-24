import type { ComponentKind } from '../../types';
import { ComponentIcon } from '../ComponentIcon';
import { KIND_LABELS } from '../../types';

interface SidebarProps {
  paletteKinds: ComponentKind[];
  onPaletteDragStart: (kind: ComponentKind) => void;
}

export function Sidebar({ paletteKinds, onPaletteDragStart, }: SidebarProps) {
  return (
      <aside className="flex h-full w-[280px] flex-col items-center gap-4 p-5 overflow-y-auto bg-[#1a2a5e] border-r-[4px] border-black shadow-2xl">
      
      <div className="w-full text-center" style={{marginTop: '20px'}}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Equipment Palette
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-[85%] place-items-center">
        {paletteKinds.map(kind => (
          <div
            key={kind}
            className="flex w-full max-w-[180px] flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-grab select-none hover:bg-zinc-800 hover:border-zinc-700 active:cursor-grabbing transition-all duration-150 group shadow-md"
            draggable
            onDragStart={() => onPaletteDragStart(kind)}
            title={`Glisser un(e) ${KIND_LABELS[kind]} sur la scène`}
          >
            <div className="transform group-hover:scale-110 transition-transform duration-150">
              <ComponentIcon kind={kind} size={40} />
            </div>
            <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 text-center truncate w-full">
              {KIND_LABELS[kind]}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}