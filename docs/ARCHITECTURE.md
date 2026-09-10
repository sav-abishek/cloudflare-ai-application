# How the application works

## The short version

The browser sends chat messages to one Cloudflare Agent. That Agent has its own durable storage. It reads the saved project profile, asks Llama 3.3 for a response, streams the answer back, and keeps the conversation for later.

After successful inference, the Agent also saves the latest readiness review: profile timestamp, change description, risk, required checks, user evidence, and feedback. Checks are derived deterministically from the profile, so this needs no extra AI call. Callable methods validate evidence updates and reject stale review IDs. Profile changes make earlier reviews outdated. The optional review field keeps existing version-one workspaces compatible.

```text
Browser chat
    |
    v
Cloudflare Worker
    |
    v
One Agent for one workspace
    |-- saved profile and chat history in Durable Object storage
    |-- Llama 3.3 through Workers AI
    |-- structured logs for operations
```

## Browser application

The browser is built with React and TypeScript. It has two main areas:

- The project profile stores simple facts such as language, required checks, and deployment risk.
- The chat lets the user describe a change or failed check.

The browser does not receive model credentials. It connects to the Agent over the Cloudflare Agents client connection.

## Cloudflare Worker

The Worker is the public entry point. It routes Agent requests and exposes a small `/health` endpoint. Requests that do not match a known route return `404 Not found`.

## Agent and durable state

Each workspace ID maps to one Agent instance. The Agent runs on a SQLite-backed Durable Object. Cloudflare saves its state and chat history, so the data survives pauses, restarts, and browser refreshes.

The Agent stores:

- project name and language;
- service type and deployment risk;
- required CI checks;
- project standards;
- request timing in a private SQL table for simple abuse control.

The AI chat library stores the conversation. Only a bounded part of that conversation is loaded into a model request.

## Model request

Before calling the model, the Agent:

1. Finds the latest user text.
2. Rejects empty or oversized input.
3. Applies a per-workspace request limit.
4. Builds a server-owned instruction using the saved profile.
5. Sends bounded recent context to Llama 3.3 through Workers AI.
6. Streams the response to the browser.

## Important boundaries

- User-entered profile text is treated as data, not trusted system instructions.
- Raw messages are not written to application logs.
- The browser cannot choose the system prompt or model binding.
- A workspace ID separates one workspace's state from another, but it is not authentication.
