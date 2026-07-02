import {
  ClipboardCheck,
  Database,
  GitBranch,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";

interface ReservedSection {
  icon: LucideIcon;
  label: string;
  detail: string;
}

// Surfaces that will attach to an inference once their backend capability
// exists. They are declared here so the detail page reserves the space and
// states, honestly, what will appear — never fake data.
const RESERVED: ReservedSection[] = [
  {
    icon: ClipboardCheck,
    label: "Evaluation",
    detail: "Judge scores and rationale for this run, once evaluations exist.",
  },
  {
    icon: Workflow,
    label: "Experiment",
    detail: "The experiment or run group this inference belongs to.",
  },
  {
    icon: GitBranch,
    label: "Prompt version",
    detail:
      "The versioned prompt template used, once prompt management exists.",
  },
  {
    icon: Database,
    label: "Dataset inclusion",
    detail: "Whether this run is part of a labeled dataset.",
  },
  {
    icon: Waypoints,
    label: "Trace link",
    detail: "A link to the distributed trace for this request.",
  },
];

/** The reserved future-section list. Every item is an honest placeholder. */
export function ReservedSections() {
  return (
    <ul className="divide-y divide-border">
      {RESERVED.map((section) => (
        <li key={section.label} className="flex gap-2.5 py-3">
          <section.icon className="mt-0.5 size-4 shrink-0 text-text-faint" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">
                {section.label}
              </span>
              <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[10px] uppercase tracking-wide text-text-faint">
                Not available yet
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-text-muted">
              {section.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
