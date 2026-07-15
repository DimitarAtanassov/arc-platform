"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui";
import {
  FUTURE_NAV,
  PRIMARY_NAV,
  isNavItemActive,
  type NavItem,
} from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Desktop-only compact mode (icons, no labels). */
  collapsed: boolean;
  /** Whether the mobile drawer is open. */
  mobileOpen: boolean;
  /** Called when navigation happens or the backdrop is dismissed. */
  onDismiss: () => void;
}

/** The ARC mark: an open arc and a node. Monoline, one accent color, no gloss. */
function BrandGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-accent"
    >
      <path
        d="M4.5 15.5a8 8 0 1 1 15 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

function groupLabelClass(collapsed: boolean): string {
  return cn(
    "px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-faint",
    collapsed && "lg:hidden",
  );
}

function NavLink({
  item,
  collapsed,
  active,
  onDismiss,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onDismiss: () => void;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onDismiss}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md py-2 pl-3 pr-2.5 text-sm",
        "transition-colors duration-[var(--t-fast)]",
        collapsed && "lg:justify-center lg:px-0",
        active
          ? "bg-accent-muted font-medium text-text"
          : "text-text-muted hover:bg-surface-raised hover:text-text",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <item.icon
        className={cn(
          "size-4 shrink-0",
          active
            ? "text-accent"
            : "text-text-faint group-hover:text-text-muted",
        )}
      />
      <span className={cn("truncate", collapsed && "lg:hidden")}>
        {item.label}
      </span>
    </Link>
  );

  // In collapsed desktop mode the label is hidden, so surface it on hover/focus.
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function Sidebar({ collapsed, mobileOpen, onDismiss }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop. Hidden on desktop where the sidebar is a static column. */}
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onDismiss}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
      />

      <aside
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[var(--sidebar-w)] flex-col",
          "border-r border-border bg-surface transition-transform duration-[var(--t-med)] ease-[var(--ease)]",
          "lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:transition-[width]",
          collapsed && "lg:w-[var(--sidebar-w-collapsed)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2.5 border-b border-border px-4">
          <BrandGlyph />
          <span
            className={cn(
              "flex items-baseline gap-1.5 whitespace-nowrap text-sm font-semibold tracking-tight text-text",
              collapsed && "lg:hidden",
            )}
          >
            ARC
            <span className="font-normal text-text-faint">Platform</span>
          </span>
        </div>

        {/* Navigation */}
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
          <div className={groupLabelClass(collapsed)}>{PRIMARY_NAV.label}</div>
          <ul className="space-y-0.5">
            {PRIMARY_NAV.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  collapsed={collapsed}
                  active={isNavItemActive(item, pathname)}
                  onDismiss={onDismiss}
                />
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <div className={groupLabelClass(collapsed)}>{FUTURE_NAV.label}</div>
            <ul className="space-y-0.5">
              {FUTURE_NAV.items.map((item) => (
                <li key={item.label}>
                  <div
                    title={item.note}
                    aria-disabled="true"
                    className={cn(
                      "flex cursor-default items-center gap-3 rounded-md py-2 pl-3 pr-2.5 text-sm text-text-faint",
                      collapsed && "lg:justify-center lg:px-0",
                    )}
                  >
                    <item.icon className="size-4 shrink-0 opacity-70" />
                    <span className={cn("truncate", collapsed && "lg:hidden")}>
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full border border-border px-1.5 py-px text-[10px] uppercase tracking-wide text-text-faint",
                        collapsed && "lg:hidden",
                      )}
                    >
                      Soon
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer: states the product boundary, honestly. */}
        <div
          className={cn(
            "shrink-0 border-t border-border px-4 py-3 text-[11px] leading-relaxed text-text-faint",
            collapsed && "lg:hidden",
          )}
        >
          Reads and drives arc-model-lab and arc-eval-service. Stores nothing.
        </div>
      </aside>
    </>
  );
}
