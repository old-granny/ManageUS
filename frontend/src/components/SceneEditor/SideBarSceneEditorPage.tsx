import type { ComponentKind } from '../../types';
import { ComponentIcon } from '../ComponentIcon';
import { KIND_LABELS } from '../../types';

interface SidebarProps {
  paletteKinds: ComponentKind[];
  onPaletteDragStart: (kind: ComponentKind) => void;
  onExport: () => void;
  onSave: () => void;
  onGoToTimeline: () => void;
  onReset: () => void;
  onImport: () => void;
}

export function Sidebar({ paletteKinds, onPaletteDragStart, onExport, onImport, onGoToTimeline, onReset }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col items-center gap-4 pt-6 pb-6 px-4 overflow-y-auto bg-zinc-950 border-r border-zinc-800 shadow-2xl">
      
      <div className="w-full text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Palette d'Équipement
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


      <div className="flex w-full flex-col items-center gap-2.5 pt-6">
        
        

        

        <button
          onClick={onImport}
          className="w-4/5 py-2 px-4 rounded text-xs font-medium bg-transparent text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer"
        >
          Importer une Scène
        </button>

        <button
          onClick={onExport}
          className="w-4/5 py-2 px-4 rounded text-xs font-medium bg-transparent text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer"
        >
          Générer JSON
        </button>

        <button
          onClick={onReset}
          className="w-4/5 py-2 px-4 rounded text-xs font-medium bg-transparent text-red-400 border border-red-700 hover:bg-red-700 hover:text-white transition-colors cursor-pointer"
        >
          Vider le plateau
        </button>
        
        <button
          onClick={onGoToTimeline}
          className="w-4/5 py-2 px-4 rounded text-xs font-medium bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 transition-colors cursor-pointer"
        >
          Créer Timeline
        </button>

        <div className="h-3" />
      </div>
    </aside>
  );
}