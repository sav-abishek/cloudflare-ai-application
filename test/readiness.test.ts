import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, workspaceStateSchema } from "../src/shared/contracts";
import {
  createReview,
  recordEvidence,
  reviewDecision,
  reviewMarkdown,
} from "../src/shared/readiness";

describe("readiness gates", () => {
  it("never treats missing CI checks as evidence of readiness", () => {
    const review = createReview(EMPTY_PROFILE);
    expect(reviewDecision(review)).toBe("Ready with conditions");
    expect(review.checks.some((check) => check.label.includes("Define required checks"))).toBe(
      true,
    );
  });
  it("blocks high-risk changes until every gate has user evidence", () => {
    let review = createReview({
      ...EMPTY_PROFILE,
      deploymentRisk: "high",
      standards: ["Rollback is required"],
    });
    expect(reviewDecision(review)).toBe("Not ready");
    expect(review.checks.some((check) => check.label.includes("tested rollback"))).toBe(true);
    for (const check of review.checks) {
      review = recordEvidence(review, {
        reviewId: review.id,
        checkId: check.id,
        evidence: "Reviewed in change CHG-123",
      });
    }
    expect(reviewDecision(review)).toBe("Ready for review");
    expect(reviewDecision(review, true)).toBe("Review outdated");
    review = recordEvidence(review, {
      reviewId: review.id,
      checkId: review.checks[0]!.id,
      evidence: "  ",
    });
    expect(reviewDecision(review)).toBe("Not ready");
  });
  it("rejects stale updates, unknown checks and oversized evidence", () => {
    const review = createReview(EMPTY_PROFILE);
    expect(() =>
      recordEvidence(review, {
        reviewId: crypto.randomUUID(),
        checkId: "check-0",
        evidence: "Done",
      }),
    ).toThrow("changed");
    expect(() =>
      recordEvidence(review, { reviewId: review.id, checkId: "missing", evidence: "Done" }),
    ).toThrow("not found");
    expect(() =>
      recordEvidence(review, {
        reviewId: review.id,
        checkId: "check-0",
        evidence: "a".repeat(501),
      }),
    ).toThrow();
  });
  it("preserves old workspaces and validates persisted reviews", () => {
    expect(
      workspaceStateSchema.parse({ profile: EMPTY_PROFILE, schemaVersion: 1 }).review,
    ).toBeUndefined();
    const review = createReview(EMPTY_PROFILE);
    expect(
      workspaceStateSchema.parse({ profile: EMPTY_PROFILE, schemaVersion: 1, review }).review,
    ).toEqual(review);
  });
  it("exports snapshot context and clear verification limits", () => {
    const review = createReview(EMPTY_PROFILE, "Add refund endpoint");
    const markdown = reviewMarkdown(review, true);
    expect(markdown).toContain("Change: Add refund endpoint");
    expect(markdown).toContain("Review outdated");
    expect(markdown).toContain("- [ ]");
    expect(markdown).toContain("not independently verified");
    expect(markdown).toContain(review.createdAt);
  });
});
