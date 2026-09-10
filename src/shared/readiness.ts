import { z } from "zod";
import type { WorkspaceProfile } from "./contracts";

export const reviewSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  profileUpdatedAt: z.string().datetime().nullable(),
  projectName: z.string().max(60),
  changeDescription: z.string().max(8000).optional(),
  risk: z.enum(["low", "medium", "high"]),
  checks: z
    .array(
      z.object({
        id: z.string().max(40),
        label: z.string().max(240),
        evidence: z.string().max(500),
      }),
    )
    .max(30),
  feedback: z.enum(["helpful", "not-helpful"]).nullable(),
});

export type ReadinessReview = z.infer<typeof reviewSchema>;

// These are profile-based gates, never model-inferred evidence or CI results.
export function createReview(profile: WorkspaceProfile, changeDescription = ""): ReadinessReview {
  const labels = [
    ...profile.ciChecks.map((check) => `CI evidence: ${check}`),
    ...profile.standards.map((standard) => `Standard: ${standard}`),
    ...(profile.ciChecks.length ? [] : ["Define required checks and provide their results"]),
    "Review the AI advice and resolve any additional blocking checks",
    ...(profile.deploymentRisk === "high"
      ? ["Document a tested rollback plan and a change owner"]
      : []),
  ];
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    profileUpdatedAt: profile.updatedAt,
    projectName: profile.name,
    changeDescription: changeDescription.slice(0, 8000),
    risk: profile.deploymentRisk,
    checks: labels.map((label, index) => ({ id: `check-${index}`, label, evidence: "" })),
    feedback: null,
  };
}

export function reviewDecision(review: ReadinessReview, stale = false) {
  if (stale) return "Review outdated";
  const pending = review.checks.filter((check) => !check.evidence.trim()).length;
  if (!pending) return "Ready for review";
  return review.risk === "high" ? "Not ready" : "Ready with conditions";
}

export function recordEvidence(
  review: ReadinessReview | null | undefined,
  input: unknown,
): ReadinessReview {
  const update = z
    .object({
      reviewId: z.string().uuid(),
      checkId: z.string().max(40),
      evidence: z.string().trim().max(500),
    })
    .parse(input);
  if (!review || review.id !== update.reviewId)
    throw new Error("This review has changed. Use the latest checklist.");
  if (!review.checks.some((check) => check.id === update.checkId))
    throw new Error("Check not found.");
  return {
    ...review,
    checks: review.checks.map((check) =>
      check.id === update.checkId ? { ...check, evidence: update.evidence } : check,
    ),
  };
}

export function reviewMarkdown(review: ReadinessReview, stale = false): string {
  const line = (value: string) => value.replace(/[\r\n]+/g, " ");
  const pending = review.checks.find((check) => !check.evidence.trim());
  return [
    `# Readiness review: ${line(review.projectName)}`,
    `Decision: ${reviewDecision(review, stale)} | ${review.risk} risk`,
    `Created: ${review.createdAt}`,
    `Profile saved: ${review.profileUpdatedAt ?? "Not saved"}`,
    `Change: ${line(review.changeDescription || "See the workspace conversation.")}`,
    "",
    "## Required evidence",
    ...review.checks.map(
      (check) =>
        `- [${check.evidence ? "x" : " "}] ${line(check.label)}${check.evidence ? ` — User evidence: ${line(check.evidence)}` : ""}`,
    ),
    "",
    `Next action: ${stale ? "Rerun the review using the updated profile." : (pending?.label ?? "Share the evidence with a human reviewer.")}`,
    "",
    "## Assumptions",
    "Evidence is supplied by the user, not independently verified. The coach has no repository or CI access. This is a review aid, not deployment approval.",
  ].join("\n");
}
