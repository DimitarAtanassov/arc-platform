import { useRouter } from "next/router";

import { formatLatency, formatTimestamp, shortId } from "@/lib/format";
import type { RequestSummary } from "@/lib/types";

import StatusBadge from "./StatusBadge";

export default function RequestTable({ rows }: { rows: RequestSummary[] }) {
  const router = useRouter();
  if (rows.length === 0) {
    return <div className="empty">No requests yet.</div>;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Request</th>
          <th>Model</th>
          <th>Status</th>
          <th className="num">Latency</th>
          <th>Time</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.request_id}
            className="row-clickable"
            onClick={() => router.push(`/requests/${row.request_id}`)}
          >
            <td className="mono">{shortId(row.request_id, 12)}</td>
            <td>{row.model_name}</td>
            <td>
              <StatusBadge status={row.status} />
            </td>
            <td className="num">{formatLatency(row.latency_ms)}</td>
            <td className="muted">{formatTimestamp(row.timestamp)}</td>
            <td className="muted">→</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
