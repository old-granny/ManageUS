import JSZip from 'jszip';
import type { Timeline, Scene, PlacedComponent } from '../types';

type TimelineStep = Timeline['steps'][number];

interface SequenceEntry {
  task_id:           string;
  start_time:        number;
  expected_end_time: number;
  args:              Record<string, string>;
}

// ── Map a component kind + action to the device task_id + args ────────────────

function buildTaskEntry(
  step: TimelineStep & { type: 'action' },
  comp: PlacedComponent | undefined,
  ledId?: number,
  fireId?: number,
): { task_id: string; args: Record<string, string> } {
  const action = step.action;
  const name   = comp?.name ?? step.componentId;
  const kind   = comp?.kind;

  switch (kind) {
    case 'led':
      // LightTask expects { mode: "ON"|"OFF", led_id: "1"…"4" }
      return { task_id: 'light', args: { mode: action, led_id: String(ledId ?? 1) } };

    case 'curtain':
      // CurtainsTask expects { mode: "OPEN"|"CLOSE" }
      return { task_id: 'curtains', args: { mode: action } };

    case 'flame':
      // FireTask expects { fire_id: "1"|"|2"|"3", mode: "ON"|"OFF" }
      return { task_id: 'fire', args: { fire_id: String(fireId ?? 1), mode: action } };

    case 'corde':
      // RopeTask expects { mode: "UP"|"DOWN" }
      return { task_id: 'rope', args: { mode: action === 'PULL' ? 'UP' : 'DOWN' } };

    case 'speaker':
      // AudioTask expects { file: "config/assets/sounds/xxx.mp3" }
      if (action === 'PLAY' && step.attachedFileName) {
        return { task_id: 'audio', args: { file: `config/assets/${step.attachedFileName}` } };
      }
      return { task_id: 'audio', args: { mode: action } };

    case 'projector':
      // ScreenTask expects { MEDIA_TYPE: "IMAGE", PATH: "config/assets/images/xxx.png", ID: name }
      if (action === 'SHOW' && step.attachedFileName) {
        return {
          task_id: 'screen',
          args: { MEDIA_TYPE: 'IMAGE', PATH: `config/assets/${step.attachedFileName}`, ID: name },
        };
      }
      return { task_id: 'screen', args: { mode: action, ID: name } };

    default:
      return { task_id: kind ?? 'unknown', args: { mode: action } };
  }
}

// ── Main export function ───────────────────────────────────────────────────────

/**
 * Builds a ZIP file containing:
 *   config/config.json      — the sequence in the device JSON format
 *   config/assets/images/   — every image attached to a SHOW step
 *   config/assets/sounds/   — every audio file attached to a PLAY step
 *
 * Triggers a browser download AND uploads the ZIP to the backend
 * at POST /manager/upload so the backend can relay it to the device.
 */
export async function exportTimelineZip(
  timeline:     Timeline,
  scene:        Scene | undefined,
  fileStore:    Map<string, File>,
  timelineName: string,
  opts: { download?: boolean } = {},
): Promise<void> {
  const { download = true } = opts;
  const zip      = new JSZip();
  const sequence: SequenceEntry[] = [];

  // Process every step – startOffset is now the absolute time position
  zip.folder(`config/assets/`);


  for (const step of timeline.steps) {
    if (step.type === 'wait') continue;   // wait steps are timing gaps, no device task

    const startTime = step.startOffset ?? 0;
    const endTime   = startTime + (step.duration ?? 1);

    const comp            = scene?.components.find(c => c.id === step.componentId);
    const ledId           = comp?.kind === 'led'   ? (comp.ledId  ?? 1) : undefined;
    const fireId          = comp?.kind === 'flame' ? (comp.fireId ?? 1) : undefined;
    const { task_id, args } = buildTaskEntry(step, comp, ledId, fireId);

    sequence.push({
      task_id,
      start_time:        parseFloat(startTime.toFixed(3)),
      expected_end_time: parseFloat(endTime.toFixed(3)),
      args,
    });
    
    // Add the attached media file to the ZIP under config/assets/
    if (step.attachedFileName) {
      const file = fileStore.get(step.id);
      if (file) zip.file(`config/assets/${step.attachedFileName}`, file);
    }
  }

  // Sort by absolute start time
  sequence.sort((a, b) => a.start_time - b.start_time);

  // ── Build steps.json ─────────────────────────────────────────────────────
  const json = JSON.stringify(
    {
      scene_name:   scene?.name ?? timelineName,
      file_version: '0.1',
      sequence,
    },
    null,
    2,
  );

  zip.file('config/config.json', json);

  // ── Generate blob ─────────────────────────────────────────────────────────
  const blob = await zip.generateAsync({ type: 'blob' });

  // ── Upload to backend ─────────────────────────────────────────────────────
  const formData = new FormData();
  formData.append('file', blob, 'config.zip');
  const uploadRes = await fetch('http://localhost:3000/manager/upload', { method: 'POST', body: formData });
  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status}`);
  }

  // ── Trigger browser download (optional) ──────────────────────────────────
  if (download) {
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${timelineName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
