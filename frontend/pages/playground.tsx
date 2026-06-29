import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Layout from "@/components/Layout";
import { ArrowRight, Playground as PlaygroundIcon, Send } from "@/components/icons";
import { CopyId, Hint } from "@/components/ui";
import { api, useAsync } from "@/lib/api";
import { formatScore, shortId } from "@/lib/format";
import type { InferResult, ProviderInfo } from "@/lib/types";

interface Turn {
  id: string;
  provider: string;
  model: string;
  system: string;
  prompt: string;
  result: InferResult;
}

export default function PlaygroundPage() {
  const providers = useAsync(() => api.listProviders(), []);
  const [provider, setProvider] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [system, setSystem] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);

  const selected: ProviderInfo | undefined = useMemo(
    () => providers.data?.find((p) => p.name === provider),
    [providers.data, provider],
  );

  // Default to the first configured provider once discovery resolves.
  useEffect(() => {
    if (provider || !providers.data?.length) return;
    const first = providers.data.find((p) => p.configured) ?? providers.data[0];
    setProvider(first.name);
    setModel(first.models[0] ?? "");
  }, [providers.data, provider]);

  // Keep the model in sync with the selected provider's suggestions.
  useEffect(() => {
    if (selected && !selected.models.includes(model)) {
      setModel(selected.models[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const canSend = prompt.trim().length > 0 && !!provider && !!model && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const result = await api.infer({ prompt, model, provider, system: system || null });
      setHistory((h) => [
        { id: result.request_id, provider, model, system, prompt, result },
        ...h,
      ]);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // ⌘/Ctrl + Enter sends.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  };

  return (
    <Layout
      section="Playground"
      title="Playground"
      subtitle="Drive a real request through the gateway: pick a provider, set a system prompt, send a message. Each call is traced and scored end to end."
      wide
    >
      <div className="split">
        <div className="card">
          <div className="card-head">
            <h2>Compose</h2>
            <span className="muted" style={{ fontSize: 12.5 }}>⌘↵ to send</span>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <label className="stack" style={{ gap: 6 }}>
              <span className="payload-label" style={{ margin: 0 }}>Provider</span>
              <select
                className="select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={!providers.data}
              >
                {providers.data?.map((p) => (
                  <option key={p.name} value={p.name} disabled={!p.configured}>
                    {p.name}{p.configured ? "" : " (no key)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack" style={{ gap: 6 }}>
              <span className="payload-label" style={{ margin: 0 }}>Model</span>
              <input
                className="input"
                list="model-options"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="model id"
              />
              <datalist id="model-options">
                {selected?.models.map((m) => <option key={m} value={m} />)}
              </datalist>
            </label>
          </div>

          <span className="payload-label">System prompt <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></span>
          <textarea
            className="input"
            style={{ height: 76, width: "100%", padding: "9px 11px", resize: "vertical", lineHeight: 1.5 }}
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            placeholder="You are a precise, terse assistant."
          />

          <span className="payload-label">Message</span>
          <textarea
            className="input"
            style={{ height: 140, width: "100%", padding: "9px 11px", resize: "vertical", lineHeight: 1.5 }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask something…"
          />

          {selected && !selected.configured && (
            <div className="alert" style={{ marginTop: 12 }}>
              No API key configured for <span className="mono">{selected.name}</span>. Set its key in
              <span className="mono"> deploy/arc.env</span> and restart the gateway, or pick the
              <span className="mono"> mock</span> provider.
            </div>
          )}
          {error && <div className="alert alert--error" style={{ marginTop: 12 }}>{error}</div>}

          <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
            <button className="btn btn--primary" onClick={send} disabled={!canSend}>
              <Send size={15} /> {sending ? "Sending…" : "Send"}
            </button>
            <div className="toolbar-spacer" />
            {history.length > 0 && (
              <button className="btn btn--ghost" onClick={() => setHistory([])}>Clear</button>
            )}
          </div>
          {sending && <div className="distill" style={{ marginTop: 12 }} />}
        </div>

        <div className="panel-sticky">
          <div className="card">
            <div className="card-head"><h2>What happens</h2></div>
            <ol className="stack" style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
              <li>The gateway calls your selected provider with the system + message.</li>
              <li>It scores the response online via the evaluator (LLM-as-judge).</li>
              <li>A trace is emitted; the run lands in Traces and Eval Runs.</li>
            </ol>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="section" style={{ marginTop: "var(--gap)" }}>
          <div className="card-head"><h2 className="serif" style={{ fontSize: 18 }}>Transcript</h2><span className="muted mono">{history.length}</span></div>
          <div className="stack" style={{ gap: "var(--gap)" }}>
            {history.map((t) => <TurnCard key={t.id} turn={t} />)}
          </div>
        </div>
      )}
    </Layout>
  );
}

function TurnCard({ turn }: { turn: Turn }) {
  const { result } = turn;
  const scores = Object.entries(result.scores);
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <span className="inline" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="tag">{turn.provider}</span>
          <span className="tag">{turn.model}</span>
          {result.blocked && <span className="badge badge--block">Blocked</span>}
          {scores.map(([judge, score]) => (
            <span className="badge badge--accent" key={judge}>{judge} {formatScore(score)}</span>
          ))}
        </span>
        <span className="inline">
          <Link href={`/traces/${result.trace_id}`} className="link inline" style={{ fontSize: 12.5 }}>
            Trace <ArrowRight size={13} />
          </Link>
          <CopyId value={result.request_id} display={shortId(result.request_id, 10)} />
        </span>
      </div>

      {turn.system && (
        <>
          <span className="payload-label">System</span>
          <pre className="payload" style={{ maxHeight: 120 }}>{turn.system}</pre>
        </>
      )}
      <span className="payload-label">Message</span>
      <pre className="payload" style={{ maxHeight: 160 }}>{turn.prompt}</pre>
      <span className="payload-label">Response</span>
      {result.blocked ? (
        <div className="alert alert--error">Blocked{result.block_reason ? `: ${result.block_reason}` : ""}</div>
      ) : (
        <pre className="payload">{result.response || "—"}</pre>
      )}
      <div className="inline" style={{ marginTop: 10 }}>
        <Link href={`/requests/${result.request_id}`} className="link inline" style={{ fontSize: 12.5 }}>
          Open request <ArrowRight size={13} />
        </Link>
        <Hint>The request, its reconstructed trace, and its eval run are all viewable from here.</Hint>
      </div>
    </div>
  );
}
