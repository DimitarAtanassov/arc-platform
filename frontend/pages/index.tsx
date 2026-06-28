import { api, useAsync } from "@/lib/api";
import Layout from "@/components/Layout";
import RequestTable from "@/components/RequestTable";

export default function RequestListPage() {
  const { data, error, loading, reload } = useAsync(() => api.listRequests(50), []);

  return (
    <Layout title="Requests" subtitle="Recent inference requests across the control plane.">
      <div className="toolbar">
        <button className="btn" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        {data && <span className="muted">{data.length} requests</span>}
      </div>
      {error && <div className="error">Failed to load requests: {error}</div>}
      {!error && loading && !data && <div className="empty">Loading…</div>}
      {data && <RequestTable rows={data} />}
    </Layout>
  );
}
