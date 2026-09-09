import { describe, expect, it } from "vitest";
import { linesToItems, normaliseWorkspaceId } from "../src/shared/contracts";

describe("normaliseWorkspaceId", () => {
  it("creates a safe, stable workspace ID", () => {
    expect(normaliseWorkspaceId("  Payments API / Europe  ")).toBe("payments-api-europe");
  });

  it("uses a safe fallback for an empty value", () => {
    expect(normaliseWorkspaceId("---")).toBe("demo-workspace");
  });

  it("limits the ID length", () => {
    expect(normaliseWorkspaceId("a".repeat(100))).toHaveLength(48);
  });
});

describe("linesToItems", () => {
  it("removes blank and repeated lines", () => {
    expect(linesToItems("Unit tests\n\nSecurity scan\nUnit tests")).toEqual([
      "Unit tests",
      "Security scan",
    ]);
  });
});
