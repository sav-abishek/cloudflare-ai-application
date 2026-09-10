import { z } from "zod";
import { reviewSchema, type ReadinessReview } from "./readiness";

export const LIMITS = {
  maxInputCharacters: 8_000,
  maxProfileItemCharacters: 120,
  maxProfileItems: 12,
  maxRequestsPerMinute: 10,
  requestWindowMs: 60_000,
} as const;

const shortText = z.string().trim().min(1).max(LIMITS.maxProfileItemCharacters);

export const workspaceProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  language: z.string().trim().max(40),
  serviceType: z.enum(["web", "api", "worker", "library", "other"]),
  ciChecks: z.array(shortText).max(LIMITS.maxProfileItems),
  deploymentRisk: z.enum(["low", "medium", "high"]),
  standards: z.array(shortText).max(LIMITS.maxProfileItems),
});

export type WorkspaceProfileInput = z.infer<typeof workspaceProfileInputSchema>;

export type WorkspaceProfile = WorkspaceProfileInput & {
  updatedAt: string | null;
};

export const workspaceStateSchema = z.object({
  profile: workspaceProfileInputSchema.extend({
    updatedAt: z.string().datetime().nullable(),
  }),
  schemaVersion: z.literal(1),
  review: reviewSchema.nullable().optional(),
});

export type WorkspaceState = {
  profile: WorkspaceProfile;
  schemaVersion: 1;
  review?: ReadinessReview | null;
};

export const EMPTY_PROFILE: WorkspaceProfile = {
  name: "New project",
  language: "",
  serviceType: "other",
  ciChecks: [],
  deploymentRisk: "medium",
  standards: [],
  updatedAt: null,
};

export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  profile: EMPTY_PROFILE,
  schemaVersion: 1,
};

export function normaliseWorkspaceId(value: string): string {
  const normalised = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalised || "demo-workspace";
}

export function linesToItems(value: string): string[] {
  return [
    ...new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
