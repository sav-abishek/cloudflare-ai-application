# Immediate product improvements

## Purpose

This is the short, next-build backlog for Engineering Codex Coach. It focuses on changes that can improve the product now, both in what it does and how it feels to use. It is not a long-term roadmap.

The product already proves the assignment requirements: Workers AI, a Cloudflare Agent, chat input, and durable memory. The most valuable next step is to make the output easier to trust and act on.

## Priority order

| Priority | Improvement                 | Why it matters now                                                                                | Product benefit                                                         |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1        | Structured readiness result | Turns a helpful chat answer into a clear delivery decision.                                       | Makes the product feel like an engineering tool, not a generic chatbot. |
| 2        | Guided project setup        | Better project context produces better advice and reduces blank-screen friction.                  | Faster first use and more consistent reviews.                           |
| 3        | Actionable report handoff   | Advice should move into the developer's normal review workflow.                                   | Makes the output useful after the chat ends.                            |
| 4        | Trust and recovery feedback | Users need to understand what the answer knows, does not know, and what to do if a request fails. | Builds confidence without overstating model capability.                 |

---

## 1. Add a structured readiness result

### Feature change

After each AI response, create and save a small readiness result with:

- **Decision:** Ready, Ready with conditions, or Not ready.
- **Blockers:** checks or missing evidence that must be resolved.
- **Required evidence:** for example, passing tests, an approval, or a rollback plan.
- **Next action:** one practical thing to do next.
- **Assumptions:** information the product does not know.

Use simple deterministic rules for known profile details. For example, a high-risk change with no rollback-plan standard should never be presented as fully ready. The AI should explain the result, not invent the underlying facts.

### UI change

Place a compact result card above the full assistant answer:

```text
READY WITH CONDITIONS                  High risk

Before review
• Add rollback evidence
• Run the required security scan

Next action: add the rollback plan, then rerun this review.
```

Use colour as a secondary cue only. Include a text label and a simple icon for each decision state. Keep the full chat response below the card for explanation.

### Why this is the highest priority

It gives the product a memorable purpose: helping engineers decide what must happen before a change proceeds. It also maps directly to Cloudflare Developer Productivity work around engineering standards, actionable guardrails, and remediation.

### Done when

- A user can understand the delivery state in under five seconds.
- The decision persists with the workspace after refresh.
- The result clearly separates supplied facts from assumptions.
- Unit tests cover all three decision states.

---

## 2. Make project setup guided, not form-heavy

### Feature change

Add lightweight project templates that prefill sensible defaults:

- **API service:** contract checks, authentication review, integration tests.
- **Cloudflare Worker:** Worker tests, binding review, compatibility date check.
- **Web application:** accessibility, performance, end-to-end tests.

Keep all values editable. A template is a shortcut, not a policy imposed on the user.

### UI change

Improve the left rail with:

- A small template chooser above the form fields.
- A profile-completeness indicator, such as “4 of 5 review inputs ready.”
- Clear missing-field hints, rather than making the user guess why advice is general.
- An `Unsaved changes` state next to the save button.

Do not add a multi-step wizard. The profile should remain visible and editable in one place.

### Why this is high priority

The model is only as useful as the engineering context supplied to it. Better setup improves every later answer while making the first-use experience less intimidating.

### Done when

- A new user can create a useful project profile in under one minute.
- Choosing a template visibly fills relevant checks and standards.
- Users can see what context is still missing.
- Nothing is saved until the user selects Save profile.

---

## 3. Help users take the result into review

### Feature change

Let users copy a concise readiness summary in Markdown or plain text. The summary should include:

- Decision and risk level.
- Blocking checks and required evidence.
- Next action.
- Assumptions.
- Timestamp and policy/profile context.

This is deliberately a copy-and-paste handoff. Do not add GitHub write access, pull-request creation, or automatic deployment.

### UI change

Add two small actions to the readiness result card:

- `Copy review checklist`
- `Mark action complete`

Show completed actions as a persisted checklist within the workspace. Keep the buttons compact and label them clearly; do not hide important actions behind an icon-only menu.

### Why this is high priority

The product becomes more valuable when its advice can be used in an existing pull-request, change-review, or release process. This creates workflow value without expanding the product's access to repositories or code.

### Done when

- Copied content is concise, readable, and does not include hidden model metadata.
- A completed action remains completed after refresh.
- The user can still see which items are blocking.

---

## 4. Make trust, feedback, and recovery visible

### Feature change

Add a small feedback signal after each readiness result:

- Helpful
- Not helpful
- Optional reason: wrong priority, missing check, unclear wording, or other

Also record only safe operational events, such as result created, copy used, feedback selected, response error, and retry success. Do not record raw prompt text in analytics.

### UI change

- Add a short “Based on your project profile” line above the result.
- Keep assumptions visible instead of burying them in the answer.
- Replace a generic connection error with a clear retry action that preserves the user's unsent message.
- Add a subtle completion confirmation after copy or checklist actions.

### Why this is important

Trust is a product experience. Developers need to know what the product considered, what it could not verify, and how to recover from a failed request without losing work.

### Done when

- A user can retry a failed request without retyping the message.
- Feedback can be submitted without exposing chat content.
- The product never implies that it inspected systems it cannot access.

---

## Build sequence

Build these as one focused loop, in this order:

1. Define the readiness-result data contract and deterministic rules.
2. Render the result card with decision, blockers, evidence, next action, and assumptions.
3. Add project templates and profile-completeness feedback so the result has better input.
4. Add copy, action completion, feedback, and retry behaviour.
5. Add tests for the result rules, saved checklist state, copy output, and the failed-request recovery path.

## What to avoid in this pass

- Another visual redesign before the readiness-result loop works.
- Voice, vector search, broad repository ingestion, or multi-agent features.
- GitHub write access, automatic pull requests, or automatic deployments.
- A large admin dashboard before there is real feedback to review.

## Product-manager test

This next pass is successful if a developer can answer these three questions quickly:

1. Is my change ready to move forward?
2. What exactly must I do before it is ready?
3. How do I take that result into my existing review process?

If the product cannot answer those questions clearly, add no further features yet.
