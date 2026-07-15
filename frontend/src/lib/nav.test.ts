import { describe, expect, it } from "vitest";

import {
  FUTURE_NAV,
  NAV_ITEMS,
  PRIMARY_NAV,
  isNavItemActive,
  type NavItem,
} from "./nav";

const overview = PRIMARY_NAV.items[0]!;
const models = PRIMARY_NAV.items[1]!;

describe("isNavItemActive", () => {
  it("marks Overview active only on the exact root path", () => {
    expect(isNavItemActive(overview, "/")).toBe(true);
    expect(isNavItemActive(overview, "/models")).toBe(false);
    expect(isNavItemActive(overview, "/inference")).toBe(false);
  });

  it("marks a section active on its own path and nested paths", () => {
    expect(isNavItemActive(models, "/models")).toBe(true);
    expect(isNavItemActive(models, "/models/gpt-4o")).toBe(true);
    expect(isNavItemActive(models, "/inference")).toBe(false);
  });

  it("does not match a sibling that shares a path prefix", () => {
    // "/model" must not activate the "/models" item.
    expect(isNavItemActive(models, "/model")).toBe(false);
  });

  it("honors extra match prefixes", () => {
    const item: NavItem = {
      href: "/history",
      label: "History",
      icon: models.icon,
      description: "",
      match: ["/runs"],
    };
    expect(isNavItemActive(item, "/runs/abc")).toBe(true);
    expect(isNavItemActive(item, "/history/abc")).toBe(true);
  });
});

describe("navigation model", () => {
  it("exposes only real, backend-backed routes as navigable items", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/",
      "/models",
      "/lab",
      "/evaluations",
      "/experiments",
      "/inference",
    ]);
  });

  it("keeps planned surfaces non-navigable (no href to route to)", () => {
    for (const item of FUTURE_NAV.items) {
      expect(item).not.toHaveProperty("href");
      expect(item.note).toMatch(/not built yet/i);
    }
  });
});
