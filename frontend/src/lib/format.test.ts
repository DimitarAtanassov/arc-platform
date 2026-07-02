import { describe, expect, it } from "vitest";

import {
  EMPTY_VALUE,
  formatDate,
  formatDateTime,
  formatLatency,
  formatNumber,
} from "./format";

describe("formatDate", () => {
  it("renders an ISO date in UTC", () => {
    expect(formatDate("2024-08-06T14:30:00Z")).toBe("2024-08-06");
  });

  it("returns the empty marker for null or invalid input", () => {
    expect(formatDate(null)).toBe(EMPTY_VALUE);
    expect(formatDate(undefined)).toBe(EMPTY_VALUE);
    expect(formatDate("not-a-date")).toBe(EMPTY_VALUE);
  });
});

describe("formatDateTime", () => {
  it("renders a compact UTC timestamp", () => {
    expect(formatDateTime("2024-08-06T14:30:59Z")).toBe("2024-08-06 14:30 UTC");
  });

  it("returns the empty marker for null", () => {
    expect(formatDateTime(null)).toBe(EMPTY_VALUE);
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(128000)).toBe("128,000");
  });

  it("returns the empty marker for null or undefined", () => {
    expect(formatNumber(null)).toBe(EMPTY_VALUE);
    expect(formatNumber(undefined)).toBe(EMPTY_VALUE);
  });
});

describe("formatLatency", () => {
  it("renders milliseconds with one decimal", () => {
    expect(formatLatency(812.5)).toBe("812.5 ms");
  });

  it("returns the empty marker for null", () => {
    expect(formatLatency(null)).toBe(EMPTY_VALUE);
  });
});
