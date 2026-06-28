import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Requests" },
  { href: "/evaluations", label: "Evaluations" },
];

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const router = useRouter();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◆</span> arc<span className="brand-dim">·platform</span>
        </div>
        <nav>
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? router.pathname === "/" || router.pathname.startsWith("/requests") || router.pathname.startsWith("/traces")
                : router.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-item nav-item--active" : "nav-item"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">MVP · mock data</div>
      </aside>
      <main className="content">
        {title && (
          <header className="page-head">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
