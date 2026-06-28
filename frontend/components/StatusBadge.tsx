import type { RequestStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
