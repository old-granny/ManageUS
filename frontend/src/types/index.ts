// =============================================================================
// Data model — Graphicus Stage Manager
// =============================================================================
// These types are shared by every part of the app (scene editor, timeline
// editor, and eventually the NestJS backend / Raspberry Pi client).
// =============================================================================

/** The four kinds of physical equipment that can be placed on a stage */
export type ComponentKind = 'light' | 'speaker' | 'projector' | 'curtain';

/** Human-readable French labels for each component kind (used in the UI) */
export const KIND_LABELS: Record<ComponentKind, string> = {
  light:     'Lumière',
  speaker:   'Haut-parleur',
  projector: 'Projecteur',
  curtain:   'Rideau',
};

/**
 * Available actions for each component kind.
 * These strings are the exact commands that will be sent to and
 * executed by the Raspberry Pi display script.
 */
export const KIND_ACTIONS: Record<ComponentKind, string[]> = {
  light:     ['ON', 'OFF'],
  speaker:   ['PLAY', 'STOP'],
  projector: ['SHOW', 'OFF'],   // SHOW requires an attached image
  curtain:   ['OPEN', 'CLOSE'],
};

/**
 * Actions that require the user to attach a media file before the step is saved.
 * Key   = action string (e.g. 'SHOW')
 * Value = accept string for <input type="file"> and the subfolder inside the ZIP
 */
export const ACTIONS_REQUIRING_FILE: Record<string, { accept: string; folder: 'images' | 'sounds' }> = {
  SHOW: { accept: 'image/*', folder: 'images' },
  PLAY: { accept: 'audio/*', folder: 'sounds' },
};

// ── Scene ─────────────────────────────────────────────────────────────────────

/**
 * A component that has been placed on the stage at a specific position.
 * Positions are stored as percentages (0–100) of the stage canvas dimensions
 * so the layout works at any screen size.
 */
export interface PlacedComponent {
  id:   string;         // unique identifier, e.g. "light-1716000000000-ab3f"
  kind: ComponentKind;
  name: string;         // user-given label, e.g. "Lumière gauche"
  x:    number;         // horizontal position as % of stage width  (0–100)
  y:    number;         // vertical   position as % of stage height (0–100)
}

/** A scene is a named arrangement of components positioned on the stage */
export interface Scene {
  id:         string;
  name:       string;
  components: PlacedComponent[];
}

// ── Timeline ──────────────────────────────────────────────────────────────────

/**
 * A timeline step is one of two variants:
 *   'action' — trigger a command on a specific component (e.g. light ON)
 *   'wait'   — pause execution for a given number of milliseconds
 *
 * Using a discriminated union means TypeScript automatically narrows the type
 * when you check `step.type`, giving you full type safety on the payload.
 */
export type TimelineStep =
  | {
      id: string;
      type: 'action';
      componentId: string;
      action: string;
      /** Path of the attached file inside the ZIP (e.g. "images/comp-123.jpg"). Undefined for actions that need no file. */
      attachedFileName?: string;
    }
  | { id: string; type: 'wait'; waitMs: number };

/** A timeline is an ordered sequence of steps bound to a specific scene */
export interface Timeline {
  id:      string;
  name:    string;
  sceneId: string;  // links back to the Scene this timeline operates on
  steps:   TimelineStep[];
}
