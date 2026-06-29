import Layout from "@/components/Layout";
import { Targets as TargetsIcon } from "@/components/icons";
import { EmptyState, Hint } from "@/components/ui";

// Eval Targets is a registry of target specs (what each extracts, its producer
// and status). No registry backend exists yet, so this teaches the concept and
// the next action rather than showing a bare "No data".
export default function EvalTargetsPage() {
  return (
    <Layout
      section="Eval Targets"
      title="Eval Targets"
      subtitle="A registry of what to evaluate: each target declares the signal it extracts from an interaction, its producer, and its current status."
    >
      <EmptyState
        art={<TargetsIcon size={48} />}
        title="No targets registered"
        actions={<a className="btn" href="https://github.com" onClick={(e) => e.preventDefault()}>Register a target</a>}
      >
        A target pairs a piece of an interaction (the input, the response, retrieved context) with
        the judges that should score it. Defining targets keeps evaluation declarative — judges run
        wherever their target appears, online or offline. Once the evaluator exposes a target
        registry, your specs and their status will be listed here.
      </EmptyState>

      <div className="grid grid-3" style={{ marginTop: "var(--gap)" }}>
        <div className="card">
          <h2>What a target captures <Hint>Targets name the slice of an interaction a judge reads.</Hint></h2>
          <p className="muted" style={{ fontSize: 13.5 }}>The extracted field — response text, retrieved passages, tool calls — plus the judges bound to it.</p>
        </div>
        <div className="card">
          <h2>Producer &amp; source</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Which service emits the signal (gateway, collector) and whether it arrives online or via offline ingestion.</p>
        </div>
        <div className="card">
          <h2>Status</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>Whether the target is actively matched against incoming interactions, and when it was last seen.</p>
        </div>
      </div>
    </Layout>
  );
}
