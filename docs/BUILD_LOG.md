# Build log

This file records what changed, why it changed, and what was checked.

## 2026-09-09 - Project foundation

### Decisions

- Chose Engineering Codex Coach as the product because it matches the Cloudflare Developer Productivity role.
- Used the official Agents starter and SDK source only as references.
- Chose the versions used by the official starter instead of automatically taking every newest package. This reduces compatibility risk.
- Used one Durable Object Agent per workspace. This gives each project separate, persistent state.
- Kept the first version text-only. Voice, GitHub write access, MCP, and code execution would increase risk before the core assignment is proven.

### Work completed

- Added the React and TypeScript application shell.
- Added an accessible project profile form and streamed chat screen.
- Added the Cloudflare Worker and `EngineeringCodexAgent`.
- Added Workers AI Llama 3.3 configuration.
- Added durable profile state and durable chat history.
- Added server-side validation, message limits, bounded model context, and a per-workspace request limit.
- Added safe Markdown rendering and avoided raw HTML.
- Added structured operational logs without raw chat content.
- Added unit tests, GitHub Actions checks, Dependabot settings, and a pull-request template.
- Added architecture, safety, deployment, reference, prompt-history, and future-agent documents.

### Verification completed

- Cloudflare environment types generated successfully.
- TypeScript type check passed.
- Formatting and lint checks passed.
- Unit tests passed: 10 tests across 3 files.
- The production bundle built successfully.
- The production dependency audit found no known vulnerabilities.
- The static production interface was inspected in a browser. Layout, labels, focusable controls, safety notice, and responsive structure rendered correctly.

### Still to verify

- Local browser behaviour with an authenticated Workers AI binding.
- Live Cloudflare deployment and persistence test.

The full local Agent could not start in the automated environment because the Workers AI remote binding requires Cloudflare authentication. No API token was requested or stored.
