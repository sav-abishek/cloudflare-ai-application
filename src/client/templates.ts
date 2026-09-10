import type { WorkspaceProfileInput } from "../shared/contracts";

export const PROJECT_TEMPLATES = [
  {
    label: "Worker",
    name: "Edge service",
    language: "TypeScript",
    serviceType: "worker",
    deploymentRisk: "medium",
    ciChecks: ["Worker unit tests", "Type check", "Binding configuration review"],
    standards: ["Review compatibility date changes", "Document rollback steps"],
  },
  {
    label: "API",
    name: "Payments API",
    language: "TypeScript",
    serviceType: "api",
    deploymentRisk: "high",
    ciChecks: [
      "Unit and integration tests",
      "API contract checks",
      "Authentication and authorization tests",
    ],
    standards: ["Name a change owner", "Test the rollback plan", "Preserve API compatibility"],
  },
  {
    label: "Web app",
    name: "Customer portal",
    language: "TypeScript",
    serviceType: "web",
    deploymentRisk: "medium",
    ciChecks: ["End-to-end tests", "Accessibility checks", "Performance budget"],
    standards: ["Test mobile and keyboard journeys", "Provide clear error and loading states"],
  },
] satisfies (WorkspaceProfileInput & { label: string })[];
