# Deployment guide

## Before you begin

You need:

- a Cloudflare account;
- Node.js 22 or newer;
- pnpm 10 or newer;
- permission to deploy Workers in the chosen Cloudflare account.

## First deployment

From the repository folder, run:

```bash
pnpm install
pnpm run types
pnpm run check
pnpm run build
pnpm exec wrangler login
pnpm exec wrangler deploy
```

`wrangler login` opens Cloudflare in a browser. Sign in and approve the requested access. The final command creates the Worker and prints its public `workers.dev` address.

## What Wrangler creates

The settings in `wrangler.jsonc` tell Cloudflare to create or connect:

- the main Worker;
- the Workers AI binding called `AI`;
- the `EngineeringCodexAgent` Durable Object binding;
- the first SQLite Durable Object migration;
- static browser assets;
- Worker observability.

The Durable Object migration must remain in the file after deployment. Removing or renaming it can break saved workspace data.

## Secrets

Workers AI uses a binding, so no model API key belongs in the browser or repository. If a later feature needs a private value, store it with:

```bash
pnpm exec wrangler secret put SECRET_NAME
```

Never add the value to Git, `.env`, screenshots, logs, or `PROMPT_HISTORY.md`.

## After deployment

1. Open the public URL.
2. Create the `payments-api` workspace.
3. Save a project profile.
4. Send one message and wait for a complete response.
5. Refresh the page and confirm that the profile and chat are still present.
6. Open `/health` and confirm it returns `{"status":"ok"}`.
7. Review Worker logs in the Cloudflare dashboard and confirm they do not contain the chat text.

## Automated deployment later

The first release should be deployed manually. After it works, create a narrowly scoped Cloudflare API token and store it in GitHub Actions secrets. Never use a full-account key. Add automatic deployment only after pull-request checks are consistently passing.
