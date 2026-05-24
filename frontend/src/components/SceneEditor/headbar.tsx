import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface HeadbarProps {
    sceneName: string;
    onSceneNameChange: (value: string) => void;
    onResetCamera: () => void;
    scale: number;
    showGrid: boolean;
    onToggleGrid: () => void;
    snapToGrid: boolean;
    onToggleSnapToGrid: () => void;
    onImport: () => void;
    onReset: () => void;
    onGoToTimeline: () => void;
    onExport: () => void;
}

export function Headbar({
    sceneName,
    onSceneNameChange,
    onResetCamera,
    scale,
    showGrid,
    onToggleGrid,
    snapToGrid,
    onToggleSnapToGrid,
    onImport,
    onExport,
    onReset, 
    onGoToTimeline,
}: HeadbarProps) {
    return (
        <header className="relative pr-6 col-span-2 flex items-center gap-6 bg-zinc-950 border-b border-zinc-800 text-white text-xs w-full min-h-14 shadow-md z-30 select-none">        
            <div className="w-0.25"></div>
            {/* Zone Logo épurée */}
            <div className="flex items-center gap-2 ">
                <img
                    src="/Logo.svg"
                    alt="Hack the Sommet"
                    className="h-10 w-10 shrink-0 "
                />
                <div className="font-['JetBrains_Mono'] select-none tracking-[0.31em] text-sm ">
                    {/* MANAGE : Couleur blanche */}
                    <span className="text-white font-normal">
                        Manage
                    </span>
                    {/* US : Vert Sherbrooke et Gras */}
                    <span className="text-[#008358] font-bold">
                        US
                    </span>
                </div>
            </div>

            <div className="flex flex-col justify-center pl-4">
                <input
                    value={sceneName}
                    onChange={e => onSceneNameChange(e.target.value)}
                    placeholder="Scene name..."
                    className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-zinc-100 h-7 w-54 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-xs placeholder-zinc-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
                />
            </div>
            
            <button
                onClick={onToggleGrid}
                className={`w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer ${
                    showGrid
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
            >
                Grid
            </button>

            <button
                onClick={onToggleSnapToGrid}
                className={`w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer ${
                    snapToGrid
                        ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-500'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
            >
                Snap
            </button>

            <div className="w-px h-6 bg-zinc-700 shrink-0" />

            <button
                onClick={onResetCamera}
                className="w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
            >
                Recenter
            </button>

            <button
                onClick={onImport}
                className="w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
            >
                Import
            </button>

            <button
                onClick={onExport}
                className="w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer bg-transparent text-teal-400 border-teal-800 hover:bg-teal-950 hover:border-teal-600"
            >
                Export
            </button>

            <button
                onClick={onReset}
                className="w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer bg-transparent text-red-400 border-red-800 hover:bg-red-950 hover:border-red-600"
            >
                Reset
            </button>

            <div className="w-px h-6 bg-zinc-700 shrink-0" />
                
            <button
                onClick={onGoToTimeline}
                className="w-[5.5rem] py-2 rounded text-sm font-medium border transition-colors cursor-pointer bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 justify-center"
            >
                Timeline <ArrowRightIcon className="w-4 h-4" />
            </button>

            <div className="hidden 2xl:flex absolute right-6 top-1/2 -translate-y-1/2 items-center gap-5 whitespace-nowrap">
                <div className="flex flex-col items-end text-[10px] font-medium text-zinc-500 tracking-wider">
                    <span>right click + move mouse</span>
                    <span>mouse wheel to zoom</span>
                </div>
                
                {/* Badge d'affichage du facteur d'échelle (Zoom) */}
                <div className="bg-zinc-900 rounded-md px-2.5 py-1.5 font-mono text-xs font-bold text-zinc-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                    {Math.round(scale * 100)}%
                </div>
            </div>    
        </header>
    );
}