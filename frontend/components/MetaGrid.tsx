import type { ReactNode } from "react";

export interface MetaItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export default function MetaGrid({ items }: { items: MetaItem[] }) {
  return (
    <dl className="meta-grid">
      {items.map((item) => (
        <div className="meta-item" key={item.label}>
          <dt>{item.label}</dt>
          <dd className={item.mono ? "mono" : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
