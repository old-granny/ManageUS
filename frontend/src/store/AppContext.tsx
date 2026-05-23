import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { Scene, Timeline } from '../types';

// =============================================================================
// Global application state — managed with React's useReducer (Redux-style).
//
// Why useReducer instead of useState?
//   - All state transitions are in one predictable place (the reducer function).
//   - Each action is a plain object, easy to log and debug.
//   - The state is automatically persisted to localStorage.
// =============================================================================

// ── State shape ───────────────────────────────────────────────────────────────

interface AppState {
  scenes:           Scene[];
  timelines:        Timeline[];
  activeSceneId:    string | null;  // which scene is open in the editor
  activeTimelineId: string | null;  // which timeline is open in the editor
  page:             'scene-editor' | 'timeline-editor';
}

const INITIAL_STATE: AppState = {
  scenes:           [],
  timelines:        [],
  activeSceneId:    null,
  activeTimelineId: null,
  page:             'scene-editor',
};

// ── Actions ───────────────────────────────────────────────────────────────────
// Discriminated union: TypeScript narrows `action.payload` automatically
// depending on which `type` string you check.

type Action =
  | { type: 'SAVE_SCENE';          scene:    Scene    }
  | { type: 'DELETE_SCENE';        id:       string   }
  | { type: 'SAVE_TIMELINE';       timeline: Timeline }
  | { type: 'SET_ACTIVE_SCENE';    id:       string | null }
  | { type: 'SET_ACTIVE_TIMELINE'; id:       string | null }
  | { type: 'SET_PAGE';            page:     AppState['page'] };

// ── Reducer ───────────────────────────────────────────────────────────────────
// Pure function: (currentState, action) => newState.
// Never mutates state directly — always returns a new object.

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case 'SAVE_SCENE': {
      // Update the scene if an entry with that id already exists, else append
      const exists = state.scenes.some(s => s.id === action.scene.id);
      return {
        ...state,
        scenes: exists
          ? state.scenes.map(s => s.id === action.scene.id ? action.scene : s)
          : [...state.scenes, action.scene],
      };
    }

    case 'DELETE_SCENE':
      return { ...state, scenes: state.scenes.filter(s => s.id !== action.id) };

    case 'SAVE_TIMELINE': {
      const exists = state.timelines.some(t => t.id === action.timeline.id);
      return {
        ...state,
        timelines: exists
          ? state.timelines.map(t => t.id === action.timeline.id ? action.timeline : t)
          : [...state.timelines, action.timeline],
      };
    }

    case 'SET_ACTIVE_SCENE':
      return { ...state, activeSceneId: action.id };

    case 'SET_ACTIVE_TIMELINE':
      return { ...state, activeTimelineId: action.id };

    case 'SET_PAGE':
      return { ...state, page: action.page };
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  state:    AppState;
  dispatch: Dispatch<Action>;
}

// Start with null; we'll throw if someone tries to use it outside the provider.
const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * AppProvider must wrap the entire application (placed once in App.tsx).
 * It makes `state` and `dispatch` available to every component via
 * the useAppStore() hook below.
 *
 * State is automatically restored from localStorage on mount and saved
 * back to localStorage after every change, so work persists across reloads.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    // Try to restore previously saved state from localStorage
    try {
      const saved = localStorage.getItem('graphicus-state');
      if (!saved) return init;
      // Always reset `page` to 'scene-editor' so the app starts fresh on reload
      // `as const` ensures TypeScript keeps the literal type, not widened `string`
      return { ...init, ...(JSON.parse(saved) as AppState), page: 'scene-editor' as const };
    } catch {
      return init;
    }
  });

  // Persist to localStorage after every state update
  useEffect(() => {
    localStorage.setItem('graphicus-state', JSON.stringify(state));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
// (AppProvider is a component; exporting a hook from the same file triggers
//  a Vite Fast Refresh warning — this comment disables it.)
/** useAppStore — call this inside any component to read and update global state.
 * @example
 *   const { state, dispatch } = useAppStore();
 *   dispatch({ type: 'SET_PAGE', page: 'timeline-editor' });
 */
export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be called inside <AppProvider>');
  return ctx;
}
