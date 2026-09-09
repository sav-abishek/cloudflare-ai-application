# Engineering Codex Coach

## Purpose

Engineering Codex Coach is a production-minded AI assistant for engineers. It turns a change description, delivery question, or non-sensitive CI failure into an actionable engineering-readiness plan. It retains a durable project profile and conversation context, so later advice remains consistent.

The project is intentionally aligned with Cloudflare's Developer Productivity work: AI-assisted development, engineering standards as actionable guardrails, developer experience, remediation workflows, and reliable internal platforms. It is not a generic chatbot.

## Assignment requirements

| Requirement              | Implementation                                                          | Demonstration                                                                                       |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| LLM                      | Cloudflare Workers AI with a Llama 3.3 model through a Worker binding   | A chat response generates a prioritised readiness checklist.                                        |
| Workflow / coordination  | Cloudflare Worker and Cloudflare Agents SDK running on a Durable Object | The Agent validates input, retrieves context, invokes the model, streams output, and commits state. |
| Chat or voice input      | React + TypeScript chat interface built with Vite                       | A user submits a change description and receives a streamed response.                               |
| Memory or state          | Durable Object SQLite state through the Agents SDK                      | Project profile and chat memory survive a refresh and influence a later response.                   |
| AI coding prompt history | `PROMPT_HISTORY.md` in the repository                                   | A chronological and sanitised record of actual development prompts.                                 |

## User journey

1. A user creates or opens a named project workspace.
2. They save the project language, service type, required checks, deployment risk, and custom standards.
3. The application stores this profile under the workspace Agent's durable identity.
4. The user describes a proposed change or pastes a non-sensitive CI failure.
5. The Agent returns an assessment, required checks, remediation plan, and assumptions.
6. The user refreshes the browser and asks a follow-up question.
7. The Agent uses the stored profile and bounded conversation history in its next answer.

## MVP requirements

### Workspace and profile

- Create/select a workspace with a stable Agent/Durable Object identity.
- Store a project profile with language, service type, CI checks, deployment risk, and custom standards.
- Validate all profile updates at the server boundary.
- Isolate all state by workspace.
- Display saved profile values and last updated time after refresh.

### Chat and LLM interaction

- Accept chat input from a React UI and show a pending state immediately.
- Stream the LLM response to the browser.
- Call Workers AI only from server-side Worker code; never expose model credentials to the client.
- Return a predictable response structure: **Assessment**, **Required checks**, **Suggested remediation**, and **Assumptions / questions**.
- Store a completed turn only after successful generation; retain a safe error state on failure.

### Durable memory

- Persist chat messages through the Cloudflare AI chat session.
- Include only the project profile and the most recent 12 messages in each LLM request.
- Add a rolling summary later if real usage shows that 12 recent messages are not enough.
- Apply a strict character/token budget to avoid unbounded cost or prompt growth.
- Provide a `Clear workspace` action with explicit confirmation.

### Safety and quality

- Do not claim to have reviewed code, CI logs, or repository data that the user has not provided.
- Make uncertainty and assumptions explicit.
- Warn users not to submit credentials, confidential code, or production data.
- Reject/limit oversized requests and rate-limit public usage.
- Render model output safely; never inject raw model HTML.
- Use request/correlation IDs and structured logs without recording secrets.

## Technical stack

| Concern          | Technology                                                         | Reason                                                                                         |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Language         | TypeScript in strict mode                                          | Matches the role and keeps contracts reliable.                                                 |
| UI               | React, Vite, accessible CSS                                        | Fast, maintainable chat UI; supported by the Agents starter.                                   |
| Runtime          | Cloudflare Workers                                                 | Global, serverless application runtime.                                                        |
| Coordination     | Cloudflare Agents SDK                                              | Durable agent identity, state sync, real-time connections, and Agent lifecycle.                |
| Durable state    | Durable Objects with SQLite                                        | Per-workspace persistence without external infrastructure.                                     |
| Model            | Workers AI, Llama 3.3                                              | Directly meets the assignment's recommendation; exact model ID remains a configurable binding. |
| Observability    | Workers structured logs; optionally AI Gateway                     | Trace failures, latency, model outcomes, and estimated use.                                    |
| Abuse protection | Turnstile and rate limiting                                        | Prevent public-demo abuse from reaching the model.                                             |
| Tests            | Vitest + `@cloudflare/vitest-pool-workers`; Playwright smoke tests | Test Cloudflare runtime logic and the visible user flow.                                       |
| Quality gates    | ESLint, Prettier, TypeScript, GitHub Actions                       | Repeatable developer workflow and pull-request quality checks.                                 |

## Architecture

```text
React / TypeScript client
       | Agent client SDK / WebSocket
       v
Cloudflare Worker router
       v
EngineeringCodexAgent (Durable Object + SQLite)
       |-- validate request and state
       |-- load project profile and bounded memory
       |-- call Workers AI (Llama 3.3)
       |-- stream response and commit state
       v
Workers Observability / structured logs
```

## State contracts

```ts
type WorkspaceProfile = {
  id: string;
  name: string;
  language?: string;
  serviceType?: "web" | "api" | "worker" | "library" | "other";
  ciChecks: string[];
  deploymentRisk: "low" | "medium" | "high";
  standards: string[];
  updatedAt: string;
};

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type WorkspaceState = {
  profile: WorkspaceProfile;
  memorySummary: string;
  recentMessages: ConversationMessage[];
  schemaVersion: 1;
};
```

## Server prompt contract

The server-owned system prompt must instruct the Agent to:

- use saved project context where relevant;
- distinguish supplied facts from assumptions;
- classify checks as blocking, recommended, or informational;
- avoid invented repository facts, CI outcomes, policy requirements, and security findings;
- refuse to expose or process credentials and sensitive information;
- return concise structured Markdown that the UI safely renders.

## Repository structure

```text
.
├── src/
│   ├── server.ts
│   ├── agent/
│   │   ├── prompts.ts
│   │   └── validation.ts
│   ├── client/
│   │   ├── App.tsx
│   │   └── styles.css
│   └── shared/contracts.ts
├── test/
│   ├── contracts.test.ts
│   ├── prompts.test.ts
│   └── validation.test.ts
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── BUILD_LOG.md
│   ├── DEPLOYMENT.md
│   ├── REFERENCES.md
│   └── THREAT_MODEL.md
├── .github/workflows/ci.yml
├── README.md
├── PROMPT_HISTORY.md
├── llm.md
├── wrangler.jsonc
└── package.json
```

## Delivery plan

### Phase 0 - project baseline

- Scaffold with `cloudflare/agents-starter`.
- Configure strict TypeScript, linting, formatting, testing, and `.gitignore`.
- Add the README, architecture documents, and prompt history file.

### Phase 1 - prove durable state

- Implement the Agent class, Durable Object binding, and SQLite migration.
- Build profile create/update/read UI.
- Verify a saved profile persists through browser refresh.

### Phase 2 - add LLM-backed chat

- Configure the Workers AI binding and prompt builder.
- Implement streaming chat, bounded memory, structured response, and error handling.
- Verify a follow-up answer uses the saved project profile.

### Phase 3 - production polish

- Add input validation, rate limiting, safe rendering, structured logs, and user-facing errors.
- Add unit, integration, and browser tests.
- Document architecture, data handling, limitations, and deployment steps.

### Phase 4 - submission

- Deploy to Cloudflare and validate the production URL.
- Record a short demo.
- Complete the real `PROMPT_HISTORY.md` without secrets or confidential data.
- Submit the repository, live URL, and demo artifact.

## Acceptance criteria

- [ ] The deployed application accepts a real chat message.
- [ ] A Workers AI Llama 3.3 call produces a structured answer.
- [ ] A Cloudflare Worker and Durable Object/Agent coordinate the request.
- [ ] Profile and conversation state persist across refresh and change a later response.
- [ ] CI runs typecheck, lint, and tests on pull requests.
- [ ] No credentials, keys, or confidential data exist in source control or logs.
- [ ] `PROMPT_HISTORY.md` contains the actual AI-assisted development process.
- [ ] A reviewer can complete the demo in under three minutes.

## Demo script

1. Open the deployed app and create the **payments-api** workspace.
2. Save: TypeScript API, high-risk deployment, tests and security review required.
3. Enter: “I am adding a new payment-refund endpoint and the CI error says the integration test is flaky.”
4. Show the structured checklist and remediation plan.
5. Refresh the browser.
6. Ask: “What checks are mandatory before I deploy this?”
7. Show that the response uses the retained TypeScript API profile and required checks.

## Deliberate v1 non-goals

- No GitHub access, pull-request creation, code execution, or autonomous deployment.
- No confidential code, credentials, or production log ingestion.
- No vector database, MCP server, voice interface, or external SaaS integration before the core assignment requirements are proven.

Once the MVP is complete, an asynchronous release-readiness Workflow, a read-only MCP tool, authentication via Cloudflare Access, and an evaluation dataset are credible follow-on enhancements.
