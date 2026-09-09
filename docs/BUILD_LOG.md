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

## 2026-09-09 - Authenticated production review

### Problems found and fixed

- The connected Cloudflare build tried to deploy before Vite had created the browser files. The deployment command is now documented and configured to run the full checked build first.
- The Worker name did not match the Worker connected to the GitHub repository. It now uses `cloudflare-ai-application` everywhere.
- The Vite setup pointed Wrangler at a `public` folder that does not exist. Vite now creates and supplies the correct asset settings.
- Older Agents packages caused the live Agent connection to fail. The Agents SDK and AI chat packages were upgraded together.
- Workers AI streaming repeated parts of model answers during local remote-binding tests. The server now gets one complete model answer and streams it safely to the browser.
- Chat headings could hide text that followed on the same line. The message display now keeps headings, paragraphs, and lists intact.

### Production and user experience improvements

- Added a `/health` endpoint for deployment checks.
- Added sampled traces and structured error logs without recording chat text.
- Added clearer project badges, capability cards, saving feedback, connection recovery, and mobile layout improvements.
- Added the visible model label so reviewers can quickly see that Workers AI is used.

### Verification completed

- Formatting, linting, and TypeScript checks passed.
- All 10 automated tests passed.
- The full production bundle built successfully.
- An authenticated Workers AI chat returned all four required answer sections without repeated text.
- The project profile and full chat remained available after a browser reload.
- The polished desktop interface was inspected in Chrome.

### Still to verify

- Cloudflare production deployment and the same journey on the public address.

## 2026-09-09 - Product interface refinement

### Work completed

- Reworked the desktop shell so the project profile and conversation scroll independently. The whole page no longer jumps or drifts while someone is reviewing a long project.
- Fixed the empty conversation view so it starts at the top instead of scrolling past its title.
- Changed the welcome area into a compact two-column guide with clear example questions.
- Added consistent Lucide icons to actions, capability labels, safety guidance, and loading feedback.
- Kept the navy, white, and Cloudflare-orange visual system while reducing visual noise and keeping controls easy to scan.
- Preserved the single-column layout for narrow screens and small devices.

### Verification completed

- The updated desktop screen was inspected in Chrome at a standard laptop size.
- The example prompt buttons correctly fill and focus the message box.
- Formatting, linting, TypeScript checks, all 10 tests, and the production build passed.
