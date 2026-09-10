# Engineering Codex Coach

Engineering Codex Coach helps developers turn a proposed change or failed build into a practical readiness checklist. It remembers each project's standards, keeps the review conversation, and gives a human reviewer a concise evidence handoff.

## Live application

[Open Engineering Codex Coach](https://cloudflare-ai-application.abishekvinodh18.workers.dev)

The public demo is intentionally open and uses workspace IDs for demo-state separation only. Do not enter credentials, confidential source code, production logs, or personal data.

## What it does

1. Choose a Worker, API, or web-app template and save the project’s checks, standards, and deployment risk.
2. Describe a change in chat. Llama 3.3 returns structured engineering advice.
3. The app creates a durable readiness checklist from the saved project context.
4. Add user-supplied evidence, copy or download the checklist, and share it with a human reviewer.

High-risk changes remain **Not ready** until every required check has evidence, including a rollback plan and owner. Lower-risk changes show **Ready with conditions** while evidence is missing. **Ready for review** means that evidence was supplied by the user; it does not claim that the application ran CI, inspected a repository, or approved a deployment.

## Features

- **Context-aware AI reviews:** Workers AI uses the saved project profile to keep answers relevant.
- **Persistent workspace memory:** profiles, chat, the latest review, evidence, and feedback survive refresh through a Durable Object.
- **Actionable handoff:** readiness decisions, evidence filters, Markdown copy/download, and stale-review protection support a real review conversation.
- **Reliable interaction:** retry, Stop/cancellation, connection recovery, preserved drafts, accessible keyboard navigation, and responsive laptop/mobile layouts.
- **Honest boundaries:** evidence remains self-reported and the interface explicitly states what it cannot verify.

## Cloudflare assignment coverage

The assignment asks for an LLM, coordination, chat or voice input, and memory or state. This application covers all four required areas in one end-to-end workflow.

| Assignment need | Implementation                                                                                 | Reviewer can verify                                                   |
| --------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| LLM             | [Workers AI](https://developers.cloudflare.com/workers-ai/) with Llama 3.3                     | Context-aware readiness advice in chat                                |
| Coordination    | [Cloudflare Agents](https://developers.cloudflare.com/agents/) and a Worker                    | Validation, streaming, review creation, and callable evidence updates |
| User input      | React chat interface                                                                           | Change review, follow-ups, retry, and cancellation                    |
| Memory/state    | [Durable Objects](https://developers.cloudflare.com/durable-objects/) with SQLite-backed state | Reloaded profile, conversation, checklist, evidence, and feedback     |

The brief recommends specific Cloudflare products but does not require every one of them. The implementation intentionally uses the smallest Cloudflare-native set that demonstrates a useful, durable AI workflow. Read the [assignment review and three-minute demo guide](docs/ASSIGNMENT_REVIEW.md) for the detailed mapping and known boundaries.

## Future roadmap

The current product is complete enough to demonstrate the assignment. The next work should improve trust and production readiness before adding more AI capabilities:

1. Add [Turnstile](https://developers.cloudflare.com/turnstile/) and authentication before broad public sharing.
2. Add a small answer-evaluation set for required headings, useful recommendations, and false-claim detection.
3. Run the existing browser suite against a staging deployment, then add physical-device and Safari coverage.
4. Add versioned review history and optional reviewer comments once the basic evidence loop has real usage.

See the [product roadmap](docs/PRODUCT_ROADMAP.md) for the prioritised feature rationale and acceptance criteria.

## Run locally

You need Node.js 22 or newer and pnpm 10.

```bash
pnpm install
pnpm run types
pnpm run dev
```

Open the local address printed in the terminal. Local AI calls use the remote Workers AI binding, so Wrangler may ask you to sign in to Cloudflare.

## Quality checks

```bash
pnpm run check
```

This checks formatting, lint rules, TypeScript, and unit tests.

Browser regressions use Playwright and installed Google Chrome. Start the app in one terminal:

```bash
pnpm run dev --host 127.0.0.1 --port 5173
```

Once the server is ready, run in another terminal:

```bash
pnpm run test:browser
```

The suite covers all three views on laptop and mobile sizes, actual scrolling, forms, workspaces, chat recovery, and the evidence workflow. It creates isolated test workspaces and makes one real Workers AI request; Cloudflare authentication and network access are required. Long-history and failure tests use controlled chat responses. Reports and screenshots are written to ignored `playwright-report/` and `test-results/` directories. `E2E_BASE_URL` can override the local address.

## Deploy

```bash
pnpm exec wrangler login
pnpm run deploy
```

Wrangler will create or update the Worker and return its public address. See the [deployment guide](docs/DEPLOYMENT.md) and [Workers deployment documentation](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) for details.

## Important documents

- [Project specification](docs/PROJECT_SPEC.md) explains the product requirements.
- [Architecture](docs/ARCHITECTURE.md) explains how the parts work together.
- [Threat model](docs/THREAT_MODEL.md) explains the main safety risks and controls.
- [Build log](docs/BUILD_LOG.md) records implementation decisions and verification results.
- [Assignment review and demo guide](docs/ASSIGNMENT_REVIEW.md) maps the implementation to the brief.
- [Product roadmap](docs/PRODUCT_ROADMAP.md) prioritises future work.
- [Prompt history](docs/PROMPT_HISTORY.md) records the AI-assisted development prompts required by the assignment.
- [Future-agent guide](docs/llm.md) explains how to work safely in this repository.

## Safety note

This is a public demonstration application. Do not enter passwords, API keys, confidential source code, personal data, or production logs.
