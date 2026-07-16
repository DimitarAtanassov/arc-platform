import {
  ArrowRight,
  Beaker,
  Boxes,
  ClipboardCheck,
  FlaskConical,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Panel } from "@/components/ui";
import { ServiceStatus } from "@/features/overview/ServiceStatus";
import { FUTURE_NAV } from "@/lib/nav";

interface Capability {
  href: string;
  label: string;
  kicker: string;
  icon: LucideIcon;
  blurb: string;
}

// The capabilities the BFF backs today, over arc-model-lab and arc-eval-service.
// Each is an entry point, not a metric — the overview orients, it does not
// fabricate a dashboard.
const CAPABILITIES: Capability[] = [
  {
    href: "/models",
    label: "Models",
    kicker: "Catalog",
    icon: Boxes,
    blurb:
      "Browse the open-source models arc-model-lab serves — provider, identifiers, revision, and status.",
  },
  {
    href: "/lab",
    label: "Playground",
    kicker: "Run",
    icon: FlaskConical,
    blurb:
      "Send a prompt to any model, read the raw completion, and score it against your metrics in place.",
  },
  {
    href: "/evaluations",
    label: "Evaluations",
    kicker: "Score",
    icon: ClipboardCheck,
    blurb:
      "Inspect the scorers and judges in the catalog and every evaluation arc-eval-service has recorded.",
  },
  {
    href: "/experiments",
    label: "Experiments",
    kicker: "Compare",
    icon: Beaker,
    blurb:
      "Pin a model and decoding config, run it repeatedly with metrics, and compare aggregate scores.",
  },
  {
    href: "/inference",
    label: "History",
    kicker: "Inspect",
    icon: History,
    blurb:
      "Trace past runs — input, prompt, output, token usage, latency, and the scores they earned.",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ARC Platform"
        title="Overview"
        description="Run, evaluate, and compare open-source models, and build the judges and guardrails that keep them honest. One console over arc-model-lab and arc-eval-service."
      />

      <section aria-labelledby="capabilities-heading" className="space-y-3">
        <h2
          id="capabilities-heading"
          className="text-xs font-medium uppercase tracking-wider text-text-faint"
        >
          Capabilities
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <Link
              key={capability.href}
              href={capability.href}
              className="group rounded-lg border border-border bg-surface p-5 transition-colors duration-[var(--t-fast)] hover:border-border-strong hover:bg-surface-raised"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-md bg-accent-muted text-accent">
                  <capability.icon className="size-4" />
                </span>
                <ArrowRight className="size-4 text-text-faint transition-transform duration-[var(--t-fast)] group-hover:translate-x-0.5 group-hover:text-text-muted" />
              </div>
              <div className="mt-4 space-y-0.5">
                <div className="text-[11px] uppercase tracking-wider text-text-faint">
                  {capability.kicker}
                </div>
                <div className="text-sm font-medium text-text">
                  {capability.label}
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
                {capability.blurb}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Services"
          description="Live reachability of the two backends this console drives."
        >
          <ServiceStatus />
        </Panel>

        <Panel
          title="Roadmap"
          description="What we're building next, shown once the backend lands."
        >
          <ul className="space-y-2.5">
            {FUTURE_NAV.items.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2.5 text-sm text-text-muted">
                  <item.icon className="size-4 text-text-faint" />
                  {item.label}
                </span>
                <Badge tone="neutral">Soon</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
