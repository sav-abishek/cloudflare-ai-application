import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/agent/prompts";
import type { WorkspaceProfile } from "../src/shared/contracts";

const profile: WorkspaceProfile = {
  name: "Payments API",
  language: "TypeScript",
  serviceType: "api",
  deploymentRisk: "high",
  ciChecks: ["Unit tests", "Security scan"],
  standards: ["Every high-risk change needs a rollback plan"],
  updatedAt: "2026-09-09T10:00:00.000Z",
};

describe("buildSystemPrompt", () => {
  it("includes the saved profile", () => {
    const prompt = buildSystemPrompt(profile);
    expect(prompt).toContain("Payments API");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Security scan");
  });

  it("requires honest and structured output", () => {
    const prompt = buildSystemPrompt(profile);
    expect(prompt).toContain("Never claim that you inspected source code");
    expect(prompt).toContain("## Required checks");
    expect(prompt).toContain("## Assumptions and questions");
  });
});
