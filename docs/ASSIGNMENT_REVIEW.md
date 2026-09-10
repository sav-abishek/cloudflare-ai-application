# Assignment review and demo guide

## Expected depth

The supplied brief requires an LLM, coordination, chat or voice input, memory, and prompt history. Its named products are recommendations. It specifies no scoring rubric, minimum feature count, or requirement to use every Cloudflare service. A reproducible journey with a useful outcome is the priority.

The Agents landing page describes input, reasoning, durable execution, and actions. The SDK documentation explains persisted chat, state synchronization, and callable methods. This project demonstrates an assisted engineering review workflow; it does not claim autonomous repository analysis.

| Requirement    | Implementation                 | Reviewer evidence                                                     |
| -------------- | ------------------------------ | --------------------------------------------------------------------- |
| LLM            | Llama 3.3 through Workers AI   | Context-aware advice for a submitted change                           |
| Coordination   | Worker routing and AIChatAgent | Validation, inference, review creation, and callable evidence updates |
| Input          | React chat                     | Questions, follow-ups, streamed display, retry                        |
| Memory         | SQLite-backed Durable Object   | Profile, chat, latest review, evidence, and feedback survive reload   |
| Prompt history | docs/PROMPT_HISTORY.md         | User requirements, AI assistance, and verification                    |

## Product value added

- Editable templates reduce setup time.
- Profile-based readiness rules produce an actionable checklist without another LLM call.
- Evidence tracking and Markdown export support a real human review handoff.
- Profile timestamps and outdated-result labels prevent stale evidence being treated as current.
- Mobile context controls, keyboard focus, connection status, and retry improve the demo journey.

## Three-minute demo

1. Open a new workspace, select **Project context**, choose the API template, and save it.
2. Select **Change review** and ask: “I am adding a payment refund endpoint. What evidence do I need before review? No CI results or rollback test have been supplied.”
3. Show the AI advice and **Not ready** result. Explain that the app has not inspected a repository or run CI.
4. Open the **Evidence board**, add a clearly marked demonstration result, and save it. Use **Needs evidence** to focus on the remaining checks.
5. Reload to show persistent profile, conversation, review, and evidence.
6. Copy or download the checklist. Show its assumptions and profile timestamp.
7. Change and save the profile; show **Review outdated**.

## Boundaries

The latest successful answer replaces the previous checklist with empty evidence. Historical chat remains; historical checklist versions are not retained. The checks come from the saved profile plus a required human review of additional AI blockers. Model prose is not parsed into verified facts. Evidence is self-reported, risk comes from the profile, and unknown change-specific risks can remain.

The optional review field preserves version-one workspaces. Server methods validate evidence and reject updates to replaced reviews or changed profiles. Arbitrary client state replacement is blocked. Durable Object names and migrations are unchanged.

A workspace ID separates demo state but is not authentication. The demo still uses a per-workspace rate limit. Authentication or Turnstile and a representative AI evaluation set are useful next hardening steps before broad sharing.

## Sources reviewed on September 10, 2026

- https://agents.cloudflare.com/ — input, LLM, durable execution, and tools; retrieved directly.
- https://developers.cloudflare.com/agents/ — reviewed through Cloudflare documentation MCP; direct HTTP retrieval was restricted.
- https://developers.cloudflare.com/agents/runtime/lifecycle/agent-class/ — chat persistence and Agent hierarchy.
- https://developers.cloudflare.com/agents/communication-channels/chat/chat-agents/ — persisted chat and clients.
- https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md — accessibility, forms, focus, and responsive review.

The suggested Vercel repository did not contain `frontend-design`. Its `web-design-guidelines` skill was installed and used with the existing frontend-design skill.
