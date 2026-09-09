import { describe, expect, it } from "vitest";
import { LIMITS } from "../src/shared/contracts";
import { assertSafeMessage, parseWorkspaceProfile } from "../src/agent/validation";

describe("parseWorkspaceProfile", () => {
  it("accepts a valid profile", () => {
    const profile = parseWorkspaceProfile({
      name: "Payments API",
      language: "TypeScript",
      serviceType: "api",
      ciChecks: ["Unit tests"],
      deploymentRisk: "high",
      standards: ["Every high-risk change needs a rollback plan"],
    });

    expect(profile.name).toBe("Payments API");
  });

  it("rejects too many standards", () => {
    expect(() =>
      parseWorkspaceProfile({
        name: "Payments API",
        language: "TypeScript",
        serviceType: "api",
        ciChecks: [],
        deploymentRisk: "high",
        standards: Array.from(
          { length: LIMITS.maxProfileItems + 1 },
          (_, index) => `Standard ${index}`,
        ),
      }),
    ).toThrow();
  });
});

describe("assertSafeMessage", () => {
  it("rejects an empty message", () => {
    expect(() => assertSafeMessage("")).toThrow("Please enter a message");
  });

  it("rejects a message over the limit", () => {
    expect(() => assertSafeMessage("a".repeat(LIMITS.maxInputCharacters + 1))).toThrow("too long");
  });
});
