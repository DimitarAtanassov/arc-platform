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
      "Browse the models arc-model-lab exposes — provider, identifiers, revision, and serving status.",
  },
  {
    href: "/lab",
    label: "Inference Lab",
    kicker: "Workbench",
    icon: FlaskConical,
    blurb:
      "Run a model against your input, read the raw result, and score it against evaluation metrics in place.",
  },
  {
    href: "/inference",
    label: "History",
    kicker: "Runs",
    icon: History,
    blurb:
      "Inspect past inference runs — input, prompt, output, token usage, latency, and recorded scores.",
  },
  {
    href: "/experiments",
    label: "Experiments",
    kicker: "Compare",
    icon: Beaker,
    blurb:
      "Pin a model and decoding config, run it repeatedly with metrics, and compare aggregated scores.",
  },
  {
    href: "/evaluations",
    label: "Evaluations",
    kicker: "Quality",
    icon: ClipboardCheck,
    blurb:
      "Browse the metric catalog and every evaluation arc-eval-service has recorded, scored per metric.",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ARC"
        title="Overview"
        description="A centralized console for inference, evaluation, and experiments, served by a thin BFF over arc-model-lab and arc-eval-service."
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Services"
          description="Reachability of the two backends this console drives."
        >
          <ServiceStatus />
        </Panel>

        <Panel
          title="System boundary"
          description="Where this console sits and what it does not do."
        >
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-md border border-border bg-surface-subtle px-2 py-1 text-text-muted">
              browser
            </span>
            <ArrowRight className="size-3.5 text-text-faint" aria-hidden />
            <span className="rounded-md border border-[var(--accent-border)] bg-accent-muted px-2 py-1 text-accent">
              BFF
            </span>
            <ArrowRight className="size-3.5 text-text-faint" aria-hidden />
            <span className="rounded-md border border-border bg-surface-subtle px-2 py-1 text-text-muted">
              arc-model-lab
            </span>
            <span className="rounded-md border border-border bg-surface-subtle px-2 py-1 text-text-muted">
              arc-eval-service
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
            The browser calls only the BFF. The BFF fans out to the two
            backends. This app owns no database and no provider keys — it stores
            nothing.
          </p>
        </Panel>

        <Panel
          title="Planned"
          description="Surfaces that arrive once a backend capability exists."
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
                <Badge tone="neutral">Planned</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
