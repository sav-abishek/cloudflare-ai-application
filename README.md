# Engineering Codex Coach

Engineering Codex Coach helps developers turn a change idea or a failed build into a clear readiness checklist. It remembers each project's standards so its advice stays consistent across later conversations.

This application is being built for the Cloudflare Developer Productivity assignment. It demonstrates:

- an LLM running through Cloudflare Workers AI;
- coordination through a Cloudflare Worker and the Agents SDK;
- a browser-based chat experience;
- durable state through a SQLite-backed Durable Object.

## Current status

The first production slice is implemented locally. It includes a durable project profile, streamed chat, bounded conversation context, simple rate limiting, safe text rendering, tests, and CI checks. Cloudflare deployment still requires account login and must be completed by the repository owner.

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

## Deploy

```bash
pnpm exec wrangler login
pnpm run deploy
```

Wrangler will create or update the Worker and return its public address. See `docs/DEPLOYMENT.md` for the full plain-language guide.

## Important documents

- `docs/PROJECT_SPEC.md` explains the product requirements.
- `docs/ARCHITECTURE.md` explains how the parts work together.
- `docs/THREAT_MODEL.md` explains the main safety risks and controls.
- `docs/BUILD_LOG.md` records implementation decisions and verification results.
- `PROMPT_HISTORY.md` records the AI-assisted development prompts required by the assignment.
- `llm.md` tells future AI agents how to work safely in this repository.

## Safety note

This is a public demonstration application. Do not enter passwords, API keys, confidential source code, personal data, or production logs.
