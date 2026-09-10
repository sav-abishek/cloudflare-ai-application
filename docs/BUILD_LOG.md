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

## 2026-09-10 - Actionable readiness workflow

- Added editable Worker, API, and web templates, completeness and save-state feedback.
- Added profile-based readiness checks after successful AI answers, with persisted user evidence and review feedback.
- Added copy/download handoff, profile invalidation, server validation, and rejected direct client state writes.
- Improved mobile context controls, focus, contrast, overflow, and retry visibility; new visitors receive separate workspace IDs.
- Added assignment mapping and demo guide; retained prior uncommitted roadmap and prompt-history work.
- Verified 15 unit tests, formatting, lint, type checks, generated bindings, and production build. A headless Chrome journey used real Workers AI and verified profile/evidence/feedback reload persistence, export, outdated status, responsive layouts, and no page errors. Screenshots and the test report are in ignored test-results/.
- No deployment or commit was performed. The existing public demo is unchanged.
- Final browser regressions also verified clipboard output, preservation of unsaved profile edits during feedback, rejection of forged state, 320/390/768/1024px layouts, and fresh-visitor workspace identity across reload. The fresh-visitor test caught and fixed a Suspense initialization loop; the app now shows an explicit workspace loading state.

## 2026-09-10 - Complete frontend redesign

- Replaced the entire visual system and app layout, using current Linear and Vercel design references and the installed frontend-design, Vercel guidelines, and web-perf skills.
- Created distinct Change review, Evidence board, and Project context views with URL navigation, browser back/forward support, and retained form drafts.
- Added a workspace switcher, quick guide, evidence filtering, completion progress, and responsive navigation. Retained all existing chat and durable-state actions.
- Self-hosted the 24.8 KB Manrope variable font with its OFL license. Context and evidence components load on demand. No runtime dependencies were added.
- Accessibility review covered loaded views and empty states; corrected secondary-text contrast. Browser screenshots are in ignored test-results/redesign-*.png.
- Final browser journey passed: templates, preserved drafts across views, saved profile reload, example prompts, real Workers AI, evidence filtering and persistence, clipboard export, feedback persistence, dialog Escape, all three views at 320/390/768/1024/1440px, outdated-review handling, fresh-visitor reload, and no page errors.
- Final verification: all 15 tests, formatting, lint, TypeScript, generated bindings, production build, and diff checks passed. Automated WCAG A/AA audits reported no violations in populated Review/Context/Evidence views and empty Review/Evidence views; manual screenshot review covered desktop and mobile.
- Performance review: production entry JavaScript is 143.04 KB gzip, CSS 6.78 KB gzip; the editor and evidence chunks load separately (2.13 KB and 2.26 KB gzip). Production field Web Vitals were not measured. No deployment or commit was performed.

## 2026-09-10 - Scrolling regression and laptop/mobile validation

- Reproduced the reported failure: the laptop grid's implicit minimum height expanded the workspace beyond the window, where the outer shell clipped it. Earlier horizontal-overflow checks did not validate vertical scrolling.
- Constrained grid rows and workspace height; made scrolling regions keyboard accessible. Kept the chat composer reachable on short mobile screens. Enabled the mobile browser viewport to resize with its keyboard where supported.
- Replaced ancestor-scrolling behavior with conversation-only scrolling. New messages follow the bottom until the reader scrolls up; viewport resizing preserves that intent. Tested the completed-review transition from laptop to a 390 × 600 viewport.
- Retained evidence drafts through filtering and view changes. Warn before discarding them through workspace switching or a new review. Enabled the SDK's explicit server cancellation option for Stop.
- Added Playwright as a development dependency and documented `pnpm run test:browser`. Excluded generated reports from Vite watching after Windows reported a file-lock error. A later dev-server restart interrupted one run; the full suite was rerun successfully against a fresh server.

### Browser verification

All **11 Playwright scenarios passed** in installed Chrome against the local Cloudflare development server:

| Area                      | Verified behavior                                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laptop and mobile layouts | All three views at 1366 × 768, 1280 × 720, 390 × 844, 360 × 640, 390 × 600, and 320 × 568; no horizontal overflow                                                                                  |
| Scrolling                 | Mouse wheel, keyboard PageDown/Home, mobile touch swipe, conversation history, bottom controls, laptop sidebars, and viewport resizing                                                             |
| Navigation and context    | Example prompts, multiline input, templates, invalid profile rejection, deduplication, save/reload, back/forward, dialogs, workspace switching, and reset confirmation                             |
| Live AI and evidence      | Real Workers AI response, required answer sections, evidence save/clear/filter, retained drafts, readiness changes, clipboard, Markdown download, feedback/reload, stale reviews, and reset        |
| Recovery                  | Controlled model failure and retry; streamed text without pulling readers from earlier messages; Stop sends a cancellation frame; connection loss disables send, retains the draft, and reconnects |

- The live integration scenario uses real Workers AI and Durable Object state. Long chat histories, model failures, and incremental response frames use deterministic fixtures to keep inference use low.
- Automated WCAG A/AA checks found no violations in the three views at laptop and mobile widths; no uncaught page errors were observed in that audit. Screenshots were inspected for laptop chat, mobile chat, and evidence controls. Generated reports remain in ignored `test-results/` and `playwright-report/`.
- Binding generation, formatting, lint, strict TypeScript, all **15 unit tests**, production build, and diff checks passed. The entry bundle is approximately 143 KB gzip; Vite reports its standard warning because uncompressed entry JavaScript is just over 500 KB.
- Coverage is Chrome on Windows with mobile viewport/touch emulation. Physical iOS/Android keyboard behavior, Safari, and the deployed public application were not tested in this pass. No deployment or commit was performed.

## 2026-09-10 - Cloudflare release

- Deployed the checked Worker and static assets to `https://cloudflare-ai-application.abishekvinodh18.workers.dev`.
- Release version: `9beef058-83ca-4220-ac37-6078b537f8cb`.
- The public `/health` endpoint returned `{"status":"ok"}` and the public page served the current rebuilt client asset.
- The local validation suite passed before deployment: formatting, lint, strict TypeScript, 15 unit tests, and production build.
- A complete public browser run began successfully, including the 1366 × 768 scenario. Later scenarios intermittently failed to establish a new Agent connection after several fresh test workspaces. Re-running an affected responsive scenario by itself passed. This is recorded as a remote capacity/startup validation gap, not as a full public browser-suite pass.
