import Layout from "@/components/Layout";
import { Guardrails as GuardrailsIcon } from "@/components/icons";
import { EmptyState, Hint } from "@/components/ui";

// Guardrails are a per-tenant configuration + outcomes surface. The gateway has
// an opt-in guardrail seam but no service yet, so this teaches the model.
export default function GuardrailsPage() {
  return (
    <Layout
      section="Guardrails"
      title="Guardrails"
      subtitle="Per-tenant policies that can block or flag an interaction on the hot path, with their outcomes over time."
    >
      <EmptyState
        art={<GuardrailsIcon size={48} />}
        title="Guardrails are not enabled"
        actions={<a className="btn" href="#" onClick={(e) => e.preventDefault()}>Configure guardrails</a>}
      >
        Guardrails sit inline in the gateway as an opt-in seam
        (<span className="mono">ARC_GUARDRAILS_ENABLED</span>). When enabled, each policy evaluates
        an interaction before it returns and can <span className="badge badge--block" style={{ verticalAlign: "middle" }}>block</span> or
        <span className="badge badge--degrade" style={{ verticalAlign: "middle", marginLeft: 4 }}>flag</span> it. Configured policies and
        their per-tenant outcomes will appear here once a guardrail service is wired in.
      </EmptyState>

      <div className="grid grid-3" style={{ marginTop: "var(--gap)" }}>
        <div className="card">
          <h2>Policies <Hint>Each policy is a rule evaluated inline on the request path.</Hint></h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Define what a tenant disallows — unsafe content, PII, jailbreak attempts — and the action on a hit.</p>
        </div>
        <div className="card">
          <h2>Failure policy</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Whether a guardrail failure blocks the response (fail-closed) or degrades gracefully (fail-open). Decided per tenant.</p>
        </div>
        <div className="card">
          <h2>Outcomes</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Block and flag rates over time, so a tenant can see how often a policy fires and tune it.</p>
        </div>
      </div>
    </Layout>
  );
}
