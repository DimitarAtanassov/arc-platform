/*
 * App shell: a quiet, keyboard-first frame around dense data views.
 * - Collapsible left nav with a tenant switcher at the top (multi-tenant).
 * - Topbar with breadcrumb, ⌘K, and theme/density controls.
 * The shell stays calm; the screens earn their density.
 */
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { isActive, NAV_GROUPS, SETTINGS_ITEM } from "@/lib/nav";
import { TENANTS, usePrefs } from "@/lib/prefs";

import CommandPalette from "./CommandPalette";
import {
  Astrolabe,
  ChevronDown,
  Command as CommandIcon,
  Density,
  Moon,
  SidebarToggle,
  Sun,
} from "./icons";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: ReactNode;
  section?: string; // breadcrumb root, e.g. "Traces"
  actions?: ReactNode; // page-head trailing actions
  wide?: boolean;
}

export default function Layout({ children, title, subtitle, section, actions, wide }: LayoutProps) {
  const router = useRouter();
  const { theme, density, tenant, sidebarCollapsed, toggleTheme, setDensity, toggleSidebar } = usePrefs();
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [tenantMenu, setTenantMenu] = useState(false);

  // ⌘K / Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={`shell${sidebarCollapsed ? " shell--collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-glyph"><Astrolabe size={22} /></span>
            <span className="brand-name"><b>ARC</b></span>
          </div>
          <TenantSwitcher open={tenantMenu} setOpen={setTenantMenu} />
        </div>

        <nav className="sidebar-scroll">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item, router.pathname);
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${active ? " nav-item--active" : ""}`}>
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Link
            href={SETTINGS_ITEM.href}
            className={`nav-item${isActive(SETTINGS_ITEM, router.pathname) ? " nav-item--active" : ""}`}
          >
            <SETTINGS_ITEM.icon size={17} />
            <span>{SETTINGS_ITEM.label}</span>
          </Link>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <button className="icon-btn" onClick={toggleSidebar} title="Toggle sidebar" aria-label="Toggle sidebar">
            <SidebarToggle size={18} />
          </button>
          <div className="breadcrumb">
            {section ? (
              <>
                <span>{section}</span>
                {title && title !== section && (
                  <>
                    <span className="sep">/</span>
                    <b>{title}</b>
                  </>
                )}
              </>
            ) : (
              <b>{title}</b>
            )}
          </div>

          <div className="topbar-spacer" />

          <button className="cmdk-trigger" onClick={() => setCmdkOpen(true)}>
            <CommandIcon size={14} />
            <span>Search</span>
            <span className="kbd" style={{ marginLeft: 6 }}>⌘K</span>
          </button>

          <div className="segmented" role="group" aria-label="Density">
            <button aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")} title="Comfortable density">
              <Density size={14} />
            </button>
            <button aria-pressed={density === "compact"} onClick={() => setDensity("compact")} title="Compact density">
              <Density size={14} style={{ transform: "scaleY(0.7)" }} />
            </button>
          </div>

          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className={`page${wide ? " page--wide" : ""}`}>
          {title && (
            <div className="page-head">
              <div className="page-head-row">
                <div>
                  <h1>{title}</h1>
                  {subtitle && <p>{subtitle}</p>}
                </div>
                {actions && <div className="inline">{actions}</div>}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  );
}

function TenantSwitcher({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { tenant, setTenant } = usePrefs();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, setOpen]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="tenant" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <span className="tenant-sigil">{tenant.sigil}</span>
        <span className="tenant-meta">
          <span className="tenant-name">{tenant.name}</span>
          <span className="tenant-label">{tenant.label}</span>
        </span>
        <span className="tenant-caret"><ChevronDown size={15} /></span>
      </button>
      {open && (
        <div className="menu" role="menu" style={{ top: "calc(100% + 6px)", left: 0, right: 0 }}>
          <div className="menu-label">Tenant</div>
          {TENANTS.map((t) => (
            <button
              key={t.id}
              className={`menu-item${t.id === tenant.id ? " menu-item--active" : ""}`}
              onClick={() => {
                setTenant(t.id);
                setOpen(false);
              }}
              role="menuitem"
            >
              <span className="tenant-sigil" style={{ width: 20, height: 20, fontSize: 11 }}>{t.sigil}</span>
              <span className="tenant-meta">
                <span className="tenant-name">{t.name}</span>
                <span className="tenant-label">{t.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
