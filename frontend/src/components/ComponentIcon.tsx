import type { ComponentKind } from '../types';

// =============================================================================
// ComponentIcon — renders a self-contained SVG icon for each component kind.
//
// All icons share the same 48×48 viewBox so they scale consistently.
// The `active` prop switches the icon to its "on" visual state.
// =============================================================================

interface Props {
  kind:    ComponentKind;
  size?:   number | string;   // rendered size in pixels (default 48) or '100%'
  width?:  number | string;
  height?: number | string;
  active?: boolean;  // true = component is currently "on"
}

export function ComponentIcon({ kind, size = 48, width, height, active = false }: Props) {
  const w = width ?? size;
  const h = height ?? size;
  switch (kind) {

    // ── Spotlight ─────────────────────────────────────────────────────────────
    case 'light':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Lumière">
          <defs>
            <linearGradient id="light-body" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#3a3a3a" />
              <stop offset="45%"  stopColor="#6e6e6e" />
              <stop offset="100%" stopColor="#2e2e2e" />
            </linearGradient>
          </defs>
          {/* Light beam — rendered first so housing sits on top */}
          <polygon
            points="16,27 32,27 43,48 5,48"
            fill={active ? 'rgba(255,215,0,0.42)' : 'rgba(180,180,180,0.08)'}
          />
          {/* Housing — trapezoid wider at top */}
          <path d="M12 7 Q24 5 36 7 L31 25 L17 25 Z" fill="url(#light-body)" />
          {/* Top shine strip */}
          <path d="M12 7 Q24 5 36 7 L34 10 Q24 8 14 10 Z" fill="rgba(255,255,255,0.13)" />
          {/* Side shadow lines */}
          <line x1="17" y1="25" x2="14" y2="13" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
          <line x1="31" y1="25" x2="34" y2="13" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
          {/* Lens bezel */}
          <ellipse cx="24" cy="25" rx="8.5" ry="2.8" fill="#1a1a1a" />
          {/* Lens */}
          <ellipse cx="24" cy="25" rx="6" ry="2" fill={active ? '#FFD000' : '#606060'} />
          {active && <ellipse cx="24" cy="25" rx="6" ry="2" fill="rgba(255,255,200,0.3)" />}
          {/* Lens glare */}
          <ellipse cx="21.5" cy="24.3" rx="1.4" ry="0.55"
            fill="rgba(255,255,255,0.45)" transform="rotate(-20 21.5 24.3)" />
          {/* Top clamp */}
          <rect x="20" y="1" width="8" height="3" rx="1.5" fill="#222" />
          <rect x="22"  y="4" width="4" height="3" fill="#2a2a2a" />
        </svg>
      );

    // ── Speaker cabinet ────────────────────────────────────────────────────────
    case 'speaker':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Haut-parleur">
          <defs>
            <linearGradient id="speaker-cab" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#8B0000" />
              <stop offset="50%"  stopColor="#C62828" />
              <stop offset="100%" stopColor="#6B0000" />
            </linearGradient>
          </defs>
          {/* Cabinet body */}
          <rect x="8" y="3" width="32" height="42" rx="4" fill="url(#speaker-cab)" />
          {/* Top edge highlight */}
          <rect x="8" y="3" width="32" height="4" rx="4" fill="rgba(255,255,255,0.15)" />
          {/* Corner screws */}
          {([[10,6],[38,6],[10,43],[38,43]] as [number,number][]).map(([x,y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="rgba(0,0,0,0.45)" />
          ))}
          {/* Woofer housing */}
          <circle cx="24" cy="21" r="11" fill="#1a1a1a" />
          {/* Woofer cone rings */}
          <circle cx="24" cy="21" r="9"   fill="none" stroke="#2e2e2e" strokeWidth="1.5" />
          <circle cx="24" cy="21" r="6.5" fill="none" stroke="#282828" strokeWidth="1.2" />
          <circle cx="24" cy="21" r="4"   fill="none" stroke="#2e2e2e" strokeWidth="1" />
          {/* Woofer dust cap */}
          <circle cx="24" cy="21" r="2" fill={active ? '#22c55e' : '#444'} />
          {/* Tweeter housing */}
          <circle cx="24" cy="37" r="6"   fill="#1a1a1a" />
          <circle cx="24" cy="37" r="4"   fill="#222" />
          <circle cx="24" cy="37" r="2.5" fill="none" stroke="#2e2e2e" strokeWidth="1" />
          {/* Tweeter dust cap */}
          <circle cx="24" cy="37" r="1.2" fill={active ? '#22c55e' : '#3a3a3a'} />
        </svg>
      );

    // ── Projector ──────────────────────────────────────────────────────────────
    case 'projector':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Projecteur">
          <defs>
            <linearGradient id="proj-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#4e4e4e" />
              <stop offset="100%" stopColor="#2a2a2a" />
            </linearGradient>
          </defs>
          {/* Light beam — behind body */}
          {active && (
            <polygon points="41,20 41,28 48,32 48,16" fill="rgba(200,230,255,0.28)" />
          )}
          {/* Body */}
          <rect x="4" y="13" width="28" height="22" rx="4" fill="url(#proj-body)" />
          {/* Top highlight */}
          <rect x="4" y="13" width="28" height="4" rx="4" fill="rgba(255,255,255,0.1)" />
          {/* Ventilation slits */}
          {[8, 11, 14].map(x => (
            <rect key={x} x={x} y="18" width="1.5" height="12" rx="0.7" fill="rgba(0,0,0,0.4)" />
          ))}
          {/* Status LED */}
          <circle cx="10" cy="32" r="2" fill={active ? '#22c55e' : '#3a3a3a'} />
          {active && <circle cx="10" cy="32" r="2" fill="none" stroke="#4ade80" strokeWidth="0.8" />}
          {/* Lens barrel */}
          <rect x="30" y="19" width="12" height="10" rx="5" fill="#333" />
          {/* Lens ring */}
          <circle cx="36" cy="24" r="5.5" fill="#1a1a1a" />
          {/* Lens glass */}
          <circle cx="36" cy="24" r="4" fill={active ? '#3a78c9' : '#2a2a2a'} />
          {active && <circle cx="36" cy="24" r="4" fill="rgba(255,255,255,0.18)" />}
          {/* Glare spot */}
          <ellipse cx="34.5" cy="22.5" rx="1.2" ry="0.8" fill="rgba(255,255,255,0.5)" />
          {/* Mounting foot */}
          <rect  x="12" y="35" width="7" height="7" rx="1" fill="#222" />
          <ellipse cx="15.5" cy="42" rx="6" ry="2" fill="#1a1a1a" />
        </svg>
      );

    // ── Theater curtain ────────────────────────────────────────────────────────
    case 'curtain':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Rideau">
          <defs>
            <linearGradient id="curtain-left" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%"   stopColor="#B71C1C" />
              <stop offset="55%"  stopColor="#D32F2F" />
              <stop offset="100%" stopColor="#7F0000" />
            </linearGradient>
            <linearGradient id="curtain-right" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#B71C1C" />
              <stop offset="55%"  stopColor="#D32F2F" />
              <stop offset="100%" stopColor="#7F0000" />
            </linearGradient>
          </defs>
          {/* Valance rod */}
          <rect x="1" y="2" width="46" height="6" rx="3" fill="#3E2723" />
          {/* Ring hooks */}
          {[5, 11, 17, 24, 31, 37, 43].map(x => (
            <circle key={x} cx={x} cy="5" r="1.8" fill="#5D4037" />
          ))}
          {/* Left drape */}
          <path d="M1 8 Q5 22 2 44 L16 44 Q12 26 18 12 Z"    fill="url(#curtain-left)" />
          <path d="M7 8 Q10 22 8 44 L10 44 Q12 26 9 8 Z"     fill="rgba(255,255,255,0.09)" />
          <path d="M3 8 Q6 22 4 44 L6 44 Q8 26 5 8 Z"        fill="rgba(0,0,0,0.18)" />
          {/* Right drape */}
          <path d="M47 8 Q43 22 46 44 L32 44 Q36 26 30 12 Z" fill="url(#curtain-right)" />
          <path d="M41 8 Q38 22 40 44 L38 44 Q36 26 39 8 Z"  fill="rgba(255,255,255,0.09)" />
          <path d="M45 8 Q42 22 44 44 L42 44 Q40 26 43 8 Z"  fill="rgba(0,0,0,0.18)" />
          {/* Stage opening */}
          <rect x="16" y="9" width="16" height="35" fill="#FFF8E1" rx="1" />
          <rect x="16" y="41" width="16" height="3"  fill="#D7CCC8" />
          {/* Gold tie-back medallions */}
          <circle cx="16" cy="26" r="3.5" fill="#FFB300" />
          <circle cx="16" cy="26" r="2"   fill="#FFD54F" />
          <circle cx="32" cy="26" r="3.5" fill="#FFB300" />
          <circle cx="32" cy="26" r="2"   fill="#FFD54F" />
        </svg>
      );

    // ── Stage Section (top-down floor view) ───────────────────────────────────
    case 'section_scene':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Section de Scène">
          {/* Stage border */}
          <rect x="2" y="2" width="44" height="44" rx="4" fill="#4E342E" />
          {/* Stage planks — alternating colour */}
          {[0,1,2,3,4,5].map(i => (
            <rect key={i}
              x="4" y={4 + i * 7} width="40" height="6"
              fill={i % 2 === 0 ? '#C9A877' : '#B8966A'}
              rx="0.5"
            />
          ))}
          {/* Plank gaps */}
          {[0,1,2,3,4].map(i => (
            <rect key={i} x="4" y={10 + i * 7} width="40" height="1" fill="#4E342E" />
          ))}
          {/* Plank joints — offset per row for realism */}
          {[0,2,4].map(i => (
            <line key={`ja-${i}`}
              x1="24" y1={4 + i * 7} x2="24" y2={10 + i * 7}
              stroke="#4E342E" strokeWidth="1.5" />
          ))}
          {[1,3,5].map(i => (
            <line key={`jb-${i}`}
              x1="16" y1={4 + i * 7} x2="16" y2={10 + i * 7}
              stroke="#4E342E" strokeWidth="1.5" />
          ))}
          {/* Stage centre-cross mark */}
          <g stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <line x1="22" y1="21" x2="26" y2="25" />
            <line x1="26" y1="21" x2="22" y2="25" />
          </g>
        </svg>
      );

    // ── Flame effect ───────────────────────────────────────────────────────────
    case 'flame':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Flamme">
          {/* Ground glow when active */}
          {active && <ellipse cx="24" cy="41" rx="11" ry="4" fill="rgba(255,100,0,0.28)" />}
          {/* Outer flame */}
          <path
            d="M24 40 Q11 33 14 21 Q16 11 24 3 Q23 15 29 19 Q36 9 32 3 Q44 15 40 27 Q42 35 24 40 Z"
            fill={active ? '#E65100' : '#6a6a6a'}
          />
          {/* Mid flame */}
          <path
            d="M24 38 Q15 31 17 21 Q19 13 24 7 Q23 17 28 21 Q34 13 31 7 Q41 17 38 27 Q39 33 24 38 Z"
            fill={active ? '#FF6D00' : '#7a7a7a'}
          />
          {/* Inner flame */}
          <path
            d="M24 36 Q18 29 20 21 Q21 15 24 11 Q24 19 27 21 Q32 15 30 11 Q38 19 35 27 Q36 31 24 36 Z"
            fill={active ? '#FFA000' : '#8a8a8a'}
          />
          {/* Hot core */}
          <path
            d="M24 33 Q20 27 22 21 Q23 17 24 14 Q24 21 27 23 Q31 17 29 14 Q35 21 33 27 Q33 30 24 33 Z"
            fill={active ? '#FFD740' : '#999'}
          />
          {/* Burner nozzle */}
          <rect x="19" y="39" width="10" height="6" rx="2" fill="#3a3a3a" />
          <rect x="15" y="43" width="18" height="4" rx="2" fill="#2a2a2a" />
        </svg>
      );

    // ── Corde — theater fly-system rope ───────────────────────────────────────
    case 'corde':
      return (
        <svg width={w} height={h} viewBox="0 0 48 48" fill="none" aria-label="Corde">
          {/* Pulley housing bracket */}
          <rect x="19" y="1" width="10" height="5" rx="2" fill="#1a1a1a" />
          {/* Pulley wheel rim */}
          <circle cx="24" cy="9"  r="5.5" fill="#424242" />
          <circle cx="24" cy="9"  r="4"   fill="#5a5a5a" />
          {/* Pulley axle */}
          <circle cx="24" cy="9"  r="1.8" fill="#212121" />
          {/* Pulley spokes */}
          <line x1="24" y1="9" x2="27" y2="9"    stroke="#333" strokeWidth="1" />
          <line x1="24" y1="9" x2="22.5" y2="11.5" stroke="#333" strokeWidth="1" />
          <line x1="24" y1="9" x2="22.5" y2="6.5"  stroke="#333" strokeWidth="1" />
          {/* Rope strand */}
          <path
            d="M21 13 Q19 21 18 30 Q17 37 16 44"
            stroke="#8D6E63" strokeWidth="3.5" strokeLinecap="round" fill="none"
          />
          {/* Rope braid highlight */}
          <path
            d="M21 13 Q19 21 18 30 Q17 37 16 44"
            stroke="#D7CCC8" strokeWidth="1" strokeLinecap="round"
            strokeDasharray="3 4" fill="none"
          />
          {/* Sandbag counterweight */}
          <rect x="8"  y="37" width="14" height="9" rx="2" fill="#6D4C41" />
          <rect x="8"  y="37" width="14" height="3" rx="2" fill="#795548" />
          <line x1="15" y1="37" x2="15" y2="46" stroke="#5D4037" strokeWidth="1" />
          {[39,41,43].map(y => (
            <line key={y} x1="9" y1={y} x2="21" y2={y} stroke="#8D6E63" strokeWidth="0.8" />
          ))}
          {/* Status indicator on housing */}
          <circle cx="35" cy="9" r="3.5" fill="#1a1a1a" />
          <circle cx="35" cy="9" r="2"   fill={active ? '#22c55e' : '#3a3a3a'} />
          {active && <circle cx="35" cy="9" r="2" fill="none" stroke="#4ade80" strokeWidth="0.7" />}
        </svg>
      );
  }
}
