import type { ComponentKind } from '../types';

// =============================================================================
// ComponentIcon — renders a self-contained SVG icon for each component kind.
//
// All icons share the same 48×48 viewBox so they scale consistently.
// The `active` prop switches the icon to its "on" visual state
// (e.g. a lit bulb for a light, a green LED for a speaker).
// =============================================================================

interface Props {
  kind:    ComponentKind;
  size?:   number;   // rendered size in pixels (default 48)
  active?: boolean;  // true = component is currently "on"
}

export function ComponentIcon({ kind, size = 48, active = false }: Props) {
  switch (kind) {

    // ── Spotlight ─────────────────────────────────────────────────────────────
    case 'light':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Lumière">
          {/* Casing — the cylindrical housing of the spotlight */}
          <rect x="10" y="16" width="28" height="14" rx="7"
            fill={active ? '#1a1a1a' : '#555'} />
          {/* Beam — triangular cone pointing downward */}
          <polygon
            points="13,30 35,30 41,46 7,46"
            fill={active ? 'rgba(255,220,50,0.55)' : 'rgba(180,180,180,0.2)'}
          />
          {/* Bulb — warm yellow when on, grey when off */}
          <circle cx="24" cy="23" r="5" fill={active ? '#FFD700' : '#888'} />
        </svg>
      );

    // ── Speaker cabinet ────────────────────────────────────────────────────────
    case 'speaker':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Haut-parleur">
          {/* Cabinet body */}
          <rect x="10" y="4" width="28" height="40" rx="4" fill="#B22222" />
          {/* Woofer (large cone) */}
          <circle cx="24" cy="16" r="8" fill="#222" />
          <circle cx="24" cy="16" r="3" fill={active ? '#22c55e' : '#555'} />
          {/* Tweeter (small cone) */}
          <circle cx="24" cy="33" r="6" fill="#222" />
          <circle cx="24" cy="33" r="2" fill={active ? '#22c55e' : '#555'} />
        </svg>
      );

    // ── Projector ──────────────────────────────────────────────────────────────
    case 'projector':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Projecteur">
          {/* Body */}
          <rect x="6" y="14" width="24" height="16" rx="4" fill="#333" />
          {/* Lens assembly */}
          <circle cx="30" cy="22" r="8" fill="#666" />
          <circle cx="30" cy="22" r="4" fill={active ? '#FFF8DC' : '#444'} />
          {/* Light beam — only visible when active */}
          {active && (
            <polygon points="38,17 38,27 48,32 48,12" fill="rgba(255,248,200,0.2)" />
          )}
          {/* Mounting foot */}
          <rect x="13" y="30" width="6" height="8" fill="#444" />
          <rect x="9"  y="36" width="14" height="4" rx="2" fill="#555" />
        </svg>
      );

    // ── Theater curtain ────────────────────────────────────────────────────────
    case 'curtain':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Rideau">
          {/* Top valance bar */}
          <rect x="2" y="2" width="44" height="7" rx="2" fill="#6B0000" />
          {/* Left drape — outer fold and inner highlight */}
          <path d="M2 9 Q10 20 6 46 L2 46 Z"            fill="#CC0000" />
          <path d="M2 9 Q16 24 12 46 L6 46 Q10 20 2 9 Z" fill="#FF4444" />
          {/* Right drape — outer fold and inner highlight */}
          <path d="M46 9 Q38 20 42 46 L46 46 Z"             fill="#CC0000" />
          <path d="M46 9 Q32 24 36 46 L42 46 Q38 20 46 9 Z" fill="#FF4444" />
          {/* Stage opening (cream) */}
          <rect x="12" y="10" width="24" height="36" fill="#FFF8E7" rx="1" />
          {/* Gold tie-back medallions */}
          <circle cx="12" cy="28" r="3" fill="#FFD700" />
          <circle cx="36" cy="28" r="3" fill="#FFD700" />
        </svg>
      );
  }
}
