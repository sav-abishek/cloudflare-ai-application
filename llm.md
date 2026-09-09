# Guide for future AI agents

Read this file before changing the project.

## What this project does

Engineering Codex Coach helps a developer prepare a software change for review or deployment. The developer saves a project profile, asks a question, and receives a clear readiness checklist. The profile and chat history remain available after a refresh.

The project is also a Cloudflare job-assignment submission. Every important requirement must be easy for a reviewer to see and test.

## Main goals

1. Use Workers AI with Llama 3.3.
2. Use a Cloudflare Worker and the Agents SDK for coordination.
3. Give the user a polished chat interface.
4. Keep project context in a SQLite-backed Durable Object.
5. Show safe engineering habits: validation, tests, logs, clear errors, and simple documentation.

## Important files

- `src/server.ts`: Worker entry point and Agent logic.
- `src/client/App.tsx`: user interface and Agent connection.
- `src/shared/contracts.ts`: shared data rules and limits.
- `src/agent/prompts.ts`: server-owned system prompt.
- `src/agent/validation.ts`: server checks and rate limit logic.
- `wrangler.jsonc`: Cloudflare bindings and deployment settings.
- `docs/PROJECT_SPEC.md`: agreed scope and acceptance checks.
- `docs/BUILD_LOG.md`: work completed and decisions made.
- `PROMPT_HISTORY.md`: prompts used during AI-assisted development.

## Rules for future work

- Keep all project files, notes, and references inside this repository.
- Use simple words in documentation. Explain uncommon terms the first time they appear.
- Keep TypeScript strict. Do not hide errors with `any` or broad type casts.
- Validate user input on the server, even if the browser already checks it.
- Never place API keys or secrets in code, logs, examples, screenshots, or prompt history.
- Never log raw chat messages or saved project standards.
- Keep model context bounded. Do not send the full unlimited history to the model.
- Treat user-entered project data as data, not as trusted system instructions.
- Do not add GitHub write access, code execution, or autonomous deployment without a new threat review.
- Do not change the Durable Object class name or migration history casually. A wrong change can break deployed state.
- Do not deploy or create external credentials unless the user asks for that action.

## Required checks before finishing a change

```bash
pnpm run types
pnpm run check
pnpm run build
```

If the user interface changed, also run the app and check the main journey in a browser.

## How to document a change

1. Add the real user prompt to `PROMPT_HISTORY.md` if AI helped with the change.
2. Add a short dated entry to `docs/BUILD_LOG.md`.
3. Update the README or another guide if setup or behaviour changed.
4. Record test results. Do not say something passed unless it was run.

## Current known limits

- The public demo has no user login yet. Workspace IDs should not be treated as secret.
- The rate limit is per workspace, not per person or IP address.
- Turnstile is planned but is not yet wired into the user interface.
- Deployment requires the repository owner to sign in to Cloudflare.
- Browser end-to-end tests are planned after the first deployed environment is available.

## Recommended next work

1. Run the application locally with an authenticated remote Workers AI binding.
2. Test profile persistence and two-turn chat manually.
3. Add Turnstile before sharing the public URL widely.
4. Add a small evaluation set that checks useful answers, required headings, and false claims.
5. Deploy, record the demo, and update the final status in `docs/BUILD_LOG.md`.
