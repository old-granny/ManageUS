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
                    placeholder="Nom de la scène..."
                    className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl text-zinc-100 h-7 w-54 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-xs placeholder-zinc-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
                />
            </div>
            
            <button
                onClick={onToggleGrid}
                className={`px-4 py-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    showGrid
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
            >
                Grid
            </button>

            <button
                onClick={onToggleSnapToGrid}
                className={`px-4 py-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                    snapToGrid
                        ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                        : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                }`}
            >
                Anchors 
            </button>

            <button
                onClick={onResetCamera}
                className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            >
                Recenter
            </button>

            <button
                onClick={onImport}
                className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
                >
                Import scene
            </button>

            <button
                onClick={onExport}
                className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
                >
                Export scene
            </button>

            <button
                onClick={onReset}
                className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            >
                Reset board
            </button>
                
            <button
                onClick={onGoToTimeline}
                className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
            >
                Create timeline
            </button>

            <div className="hidden xl:flex absolute right-6 top-1/2 -translate-y-1/2 items-center gap-5 whitespace-nowrap">
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