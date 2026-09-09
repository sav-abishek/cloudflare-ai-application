# Safety review

This document explains what could go wrong and how the first version reduces the risk.

## Data entered by users

**Risk:** A user may paste a password, private source code, personal data, or a production log.

**Current control:** The interface shows a clear warning. Messages have a size limit. Application logs record request facts such as length and timing, not message content.

**Remaining work:** Add stronger secret-pattern checks before a public launch. No automated check can guarantee that all sensitive information is found.

## Instructions hidden in project text

**Risk:** A project standard or chat message may try to replace the Agent's real rules.

**Current control:** The system instruction says that project profile text is untrusted data. Model instructions are built on the server and cannot be changed by the browser.

## Public cost abuse

**Risk:** Someone may send many messages and create unnecessary model cost.

**Current control:** Each workspace allows a limited number of requests per minute. Input and output sizes are bounded.

**Remaining work:** Add Cloudflare Turnstile and an account-level rate-limiting rule before wide public sharing.

## Workspace privacy

**Risk:** A person who knows another workspace ID may connect to that workspace.

**Current control:** Workspace state is isolated by Durable Object identity.

**Known limit:** A workspace ID is not a password. The demo must not store private information. Add Cloudflare Access before using the application with real internal data.

## Unsafe model claims

**Risk:** The model may claim it reviewed code or found a security problem without evidence.

**Current control:** The server prompt requires the model to separate facts from assumptions and not claim access it does not have. The response must include an assumptions section.

**Remaining work:** Add an evaluation set and measure false claims before calling the system production-ready for business use.

## Browser rendering

**Risk:** Model output may contain harmful HTML or scripts.

**Current control:** The application uses a Markdown renderer and does not inject raw HTML into the page.

## Operational failures

**Risk:** A model request may fail, stall, or be interrupted by a deployment.

**Current control:** Chat recovery is enabled, stalled streams time out, old state remains saved, and the user receives a clear error. A health endpoint supports basic service checks.
