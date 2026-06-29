/*
 * Command palette (⌘K). Industry-standard for this audience, and the one place
 * a faint arcane flourish is welcome (the sigil in the prompt). Everything it
 * does is plain: jump to a section, switch tenant, flip theme/density.
 */
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

import { ALL_NAV } from "@/lib/nav";
import { TENANTS, usePrefs } from "@/lib/prefs";

import { ChevronRight, Search, Sparkles } from "./icons";

interface Command {
  id: string;
  group: string;
  label: string;
  keywords: string;
  hint?: string;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { theme, density, setTheme, setDensity, setTenant } = usePrefs();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      void router.push(href);
      onClose();
    };
    const nav = ALL_NAV.map((n) => ({
      id: `nav:${n.href}`,
      group: "Go to",
      label: n.label,
      keywords: n.label.toLowerCase(),
      hint: "Jump",
      run: go(n.href),
    }));
    const tenants = TENANTS.map((t) => ({
      id: `tenant:${t.id}`,
      group: "Switch tenant",
      label: t.name,
      keywords: `tenant ${t.name.toLowerCase()} ${t.label.toLowerCase()}`,
      run: () => {
        setTenant(t.id);
        onClose();
      },
    }));
    const actions: Command[] = [
      {
        id: "theme",
        group: "Preferences",
        label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        keywords: "theme light dark appearance",
        run: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          onClose();
        },
      },
      {
        id: "density",
        group: "Preferences",
        label: density === "comfortable" ? "Use compact density" : "Use comfortable density",
        keywords: "density compact comfortable rows",
        run: () => {
          setDensity(density === "comfortable" ? "compact" : "comfortable");
          onClose();
        },
      },
    ];
    return [...nav, ...tenants, ...actions];
  }, [router, onClose, theme, density, setTheme, setDensity, setTenant]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  };

  // Group while preserving order.
  const groups: { label: string; items: Command[] }[] = [];
  for (const cmd of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.label === cmd.group) last.items.push(cmd);
    else groups.push({ label: cmd.group, items: [cmd] });
  }

  let flatIndex = -1;

  return (
    <div className="cmdk-overlay" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="cmdk-input-wrap">
          <Sparkles size={18} />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search sections, tenants, preferences…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Command"
          />
          <Search size={16} style={{ color: "var(--text-faint)" }} />
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">No matches.</div>}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="cmdk-group">{g.label}</div>
              {g.items.map((cmd) => {
                flatIndex += 1;
                const idx = flatIndex;
                return (
                  <div
                    key={cmd.id}
                    className={`cmdk-item${idx === active ? " cmdk-item--active" : ""}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => cmd.run()}
                  >
                    <ChevronRight size={14} />
                    {cmd.label}
                    {cmd.hint && <span className="cmdk-hint">{cmd.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> select</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
