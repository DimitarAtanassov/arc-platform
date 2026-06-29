import Layout from "@/components/Layout";
import { Moon, Sun } from "@/components/icons";
import { Hint, Skeleton } from "@/components/ui";
import { api, API_BASE, useAsync } from "@/lib/api";
import { TENANTS, usePrefs } from "@/lib/prefs";

export default function SettingsPage() {
  const { theme, density, tenant, setTheme, setDensity, setTenant } = usePrefs();
  const models = useAsync(() => api.listModels(), []);

  return (
    <Layout section="Settings" title="Settings" subtitle="Preferences are stored in this browser. Service configuration is read-only and lives with the evaluator.">
      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h2>Appearance</h2></div>

          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 540 }}>Theme</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Dark is the default; light is a full apothecary-daylight peer.</div>
            </div>
            <div className="segmented" role="group" aria-label="Theme">
              <button aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={14} /> Dark</button>
              <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={14} /> Light</button>
            </div>
          </div>

          <hr className="divider" />

          <div className="row-between">
            <div>
              <div style={{ fontWeight: 540 }}>Density</div>
              <div className="muted" style={{ fontSize: 12.5 }}>Compact tightens table and control spacing for dense work.</div>
            </div>
            <div className="segmented" role="group" aria-label="Density">
              <button aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")}>Comfortable</button>
              <button aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>Compact</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Tenant</h2></div>
          <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>The active workspace scopes the views you see. Switch instantly from the sidebar or ⌘K.</p>
          <div className="stack" style={{ marginTop: 10 }}>
            {TENANTS.map((t) => (
              <button
                key={t.id}
                className={`menu-item${t.id === tenant.id ? " menu-item--active" : ""}`}
                style={{ border: "1px solid var(--border)" }}
                onClick={() => setTenant(t.id)}
              >
                <span className="tenant-sigil" style={{ width: 22, height: 22, fontSize: 11 }}>{t.sigil}</span>
                <span className="tenant-meta">
                  <span className="tenant-name">{t.name}</span>
                  <span className="tenant-label">{t.label}</span>
                </span>
                {t.id === tenant.id && <span className="mono faint" style={{ marginLeft: "auto", fontSize: 11 }}>active</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head">
          <h2>Judge-model profiles <Hint>Profiles the evaluator runs judges on. Configured server-side via ARC_EVAL_MODEL_PROFILES; credentials never leave the evaluator.</Hint></h2>
          <span className="muted mono">read-only</span>
        </div>
        {models.error && <div className="alert alert--error">Failed to load model profiles: {models.error}</div>}
        {!models.data && !models.error && <Skeleton height={48} />}
        {models.data && models.data.length === 0 && (
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            No model profiles configured. Without one, the evaluator cannot run LLM-as-judge scoring —
            set <span className="mono">ARC_EVAL_MODEL_PROFILES</span> (and a default judge) on the evaluator.
          </p>
        )}
        {models.data && models.data.length > 0 && (
          <div className="table-wrap" style={{ border: "none" }}>
            <table className="table">
              <thead><tr><th>Profile</th><th>Provider</th><th>Model</th><th>Base URL</th></tr></thead>
              <tbody>
                {models.data.map((m) => (
                  <tr key={m.name}>
                    <td className="mono">{m.name}</td>
                    <td>{m.provider}</td>
                    <td className="mono">{m.model}</td>
                    <td className="td-mono">{m.base_url ?? "default"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "var(--gap)" }}>
        <div className="card-head"><h2>Connection</h2></div>
        <dl className="kv">
          <div className="kv-row"><dt>BFF base URL</dt><dd>{API_BASE}</dd></div>
          <div className="kv-row"><dt>Configured via</dt><dd>NEXT_PUBLIC_API_BASE</dd></div>
        </dl>
      </div>
    </Layout>
  );
}
