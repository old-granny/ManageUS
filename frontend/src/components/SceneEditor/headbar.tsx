interface HeadbarProps {
    sceneName: string;
    onSceneNameChange: (value: string) => void;
    onResetCamera: () => void;
    scale: number;
    showGrid: boolean;
    onToggleGrid: () => void;
    snapToGrid: boolean;
    onToggleSnapToGrid: () => void;
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
}: HeadbarProps) {
    return (
        <header className="col-span-2 flex items-center gap-3 px-4 bg-[#0b1121] border-b-2 border-black text-white text-sm">
            <span className="font-bold text-lg mr-2">Managus</span>
            <label htmlFor="scene-name" className="text-white/70 whitespace-nowrap">Scène :</label>
            <input
                id="scene-name"
                value={sceneName}
                onChange={e => onSceneNameChange(e.target.value)}
                placeholder="Nom de la scène..."
                className="bg-[#2d2d3f] border border-zinc-600 rounded-md text-white px-3 py-1 w-64 outline-none focus:border-green-500 transition-colors"
            />
            <button
                onClick={onResetCamera}
                className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors text-white text-xs font-semibold"
            >
                Recentre ({Math.round(scale * 100)}%)
            </button>
            <button
                onClick={onToggleGrid}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${showGrid ? 'bg-blue-700 hover:bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'} text-white`}
            >
                {showGrid ? 'Grille: On' : 'Grille: Off'}
            </button>
            <button
                onClick={onToggleSnapToGrid}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${snapToGrid ? 'bg-purple-700 hover:bg-purple-600' : 'bg-zinc-700 hover:bg-zinc-600'} text-white`}
            >
                {snapToGrid ? 'Snap: On' : 'Snap: Off'}
            </button>
        </header>
    );
}