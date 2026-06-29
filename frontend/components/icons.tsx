/*
 * ARC icon set — thin-line, celestial-cartography / alchemical sensibility.
 * Recognizable as standard icons first (a gear is a gear), character second.
 * All icons inherit `currentColor` and a shared stroke style.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* --- Brand: an astrolabe arc + constellation node ----------------------- */
export const Astrolabe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 12h17" opacity="0.55" />
    <path d="M5 7.5a11 11 0 0 0 14 0M5 16.5a11 11 0 0 1 14 0" opacity="0.55" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
);

/* --- Nav --------------------------------------------------------------- */
// Dashboard — a small constellation/quadrant chart.
export const Dashboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
    <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="6" rx="1.5" />
    <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
  </Svg>
);

// Traces — a waterfall of offset spans.
export const Traces = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h12" />
    <path d="M6 12h12" />
    <path d="M9 18h9" />
    <circle cx="3" cy="6" r="0.5" fill="currentColor" />
  </Svg>
);

// Spans — nested lineage nodes.
export const Spans = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="6" r="2" />
    <circle cx="13" cy="12" r="2" />
    <circle cx="19" cy="18" r="2" />
    <path d="M5 8v3a2 2 0 0 0 2 2h4M13 14v1a2 2 0 0 0 2 2h2" opacity="0.7" />
  </Svg>
);

// Eval Targets — an assay/target mark.
export const Targets = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" opacity="0.7" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

// Eval Runs — a distillation flask.
export const Runs = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3h6M10 3v5.5L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3" />
    <path d="M7.5 14h9" opacity="0.7" />
  </Svg>
);

// Judges — a balance scale (BLOCKING/DEGRADING verdicts).
export const Judges = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v16M7 20h10" />
    <path d="M5 7h14M5 7l-2.5 5a2.5 2.5 0 0 0 5 0L5 7M19 7l-2.5 5a2.5 2.5 0 0 0 5 0L19 7" />
    <circle cx="12" cy="4.5" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

// Guardrails — a warding shield.
export const Guardrails = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
    <path d="M9.5 12l1.8 1.8L15 10" opacity="0.8" />
  </Svg>
);

// Pipeline Health — an ingestion pulse.
export const Pipeline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h4l2-5 3 10 2-7 1.5 4H21" />
  </Svg>
);

// Playground — an alembic/retort: where a prompt is distilled into a response.
export const Playground = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3h4M11 3v4.5L6.5 17a2.5 2.5 0 0 0 2.3 3.5h6.4a2.5 2.5 0 0 0 2.3-3.5L13 7.5V3" />
    <path d="M8.2 14h7.6" opacity="0.7" />
    <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

// Send — a paper plane.
export const Send = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4L21 3Z" />
  </Svg>
);

// Settings — a gear is a gear.
export const Settings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19 5l-1.8 1.8M6.8 17.2 5 19M19 19l-1.8-1.8M6.8 6.8 5 5" />
  </Svg>
);

/* --- Utility ----------------------------------------------------------- */
export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const Command = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
  </Svg>
);

export const Sparkles = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.6 4.8L18.5 9.4 13.6 11 12 16l-1.6-5L5.5 9.4l4.9-1.6L12 3Z" />
    <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" opacity="0.7" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Svg>
);

export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </Svg>
);

export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Svg>
);

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5 10 17l9-10" />
  </Svg>
);

export const Sun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </Svg>
);

export const Moon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" />
  </Svg>
);

export const SidebarToggle = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Svg>
);

export const Refresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v4h-4" />
  </Svg>
);

export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const Density = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </Svg>
);

export const Diff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3v6M3 6h6M6 15v6M3 18h6" />
    <path d="M14 5h7M14 12h7M14 19h7" opacity="0.7" />
  </Svg>
);

export const External = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Svg>
);

/* --- Status / verdict (non-color cue) ---------------------------------- */
export const PassIcon = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 13}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5 11 15.5 16 9" />
  </Svg>
);

export const DegradeIcon = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 13}>
    <path d="M12 3 22 20H2L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
);

export const BlockIcon = (p: IconProps) => (
  <Svg {...p} size={p.size ?? 13}>
    <path d="M7.5 3h9L21 7.5v9L16.5 21h-9L3 16.5v-9L7.5 3Z" />
    <path d="M9 12h6" />
  </Svg>
);
