import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { callable, routeAgentRequest } from "agents";
import {
  convertToModelMessages,
  pruneMessages,
  simulateStreamingMiddleware,
  streamText,
  wrapLanguageModel,
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { buildSystemPrompt } from "./agent/prompts";
import { assertSafeMessage, latestUserText, parseWorkspaceProfile } from "./agent/validation";
import {
  INITIAL_WORKSPACE_STATE,
  LIMITS,
  workspaceStateSchema,
  type WorkspaceProfileInput,
  type WorkspaceState,
} from "./shared/contracts";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_CONTEXT_MESSAGES = 12;

export class EngineeringCodexAgent extends AIChatAgent<Env, WorkspaceState> {
  initialState: WorkspaceState = INITIAL_WORKSPACE_STATE;
  maxPersistedMessages = 80;
  hydrationByteBudget = 2 * 1024 * 1024;
  chatStreamStallTimeoutMs = 60_000;

  onStart(): void {
    void this.sql`
      CREATE TABLE IF NOT EXISTS request_limits (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      )
    `;
  }

  validateStateChange(nextState: WorkspaceState): void {
    workspaceStateSchema.parse(nextState);
  }

  private takeRequestSlot(now: number): boolean {
    const cutoff = now - LIMITS.requestWindowMs;
    void this.sql`DELETE FROM request_limits WHERE created_at < ${cutoff}`;
    const rows = this.sql<{ total: number }>`
      SELECT COUNT(*) AS total FROM request_limits
    `;

    if ((rows[0]?.total ?? 0) >= LIMITS.maxRequestsPerMinute) {
      return false;
    }

    void this.sql`
      INSERT INTO request_limits (id, created_at)
      VALUES (${crypto.randomUUID()}, ${now})
    `;
    return true;
  }

  @callable()
  updateProfile(input: WorkspaceProfileInput): WorkspaceState {
    const profile = parseWorkspaceProfile(input);
    const nextState: WorkspaceState = {
      ...this.state,
      profile: {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
    };

    this.setState(nextState);
    return nextState;
  }

  @callable()
  resetProfile(): WorkspaceState {
    const nextState: WorkspaceState = {
      ...INITIAL_WORKSPACE_STATE,
      profile: { ...INITIAL_WORKSPACE_STATE.profile },
    };
    this.setState(nextState);
    return nextState;
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const text = latestUserText(this.messages);
    assertSafeMessage(text);

    const requestId = crypto.randomUUID();
    const now = Date.now();

    if (!this.takeRequestSlot(now)) {
      console.warn(
        JSON.stringify({
          event: "chat_rate_limited",
          requestId,
          workspace: this.name,
        }),
      );
      throw new Error("Too many requests. Please wait one minute and try again.");
    }

    console.log(
      JSON.stringify({
        event: "chat_started",
        requestId,
        workspace: this.name,
        inputCharacters: text.length,
        model: MODEL_ID,
      }),
    );

    const workersAI = createWorkersAI({ binding: this.env.AI });
    const result = streamText({
      model: wrapLanguageModel({
        model: workersAI(MODEL_ID, {
          sessionAffinity: this.sessionAffinity,
        }),
        middleware: simulateStreamingMiddleware(),
      }),
      system: buildSystemPrompt(this.state.profile),
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages.slice(-MAX_CONTEXT_MESSAGES)),
        toolCalls: "before-last-2-messages",
        reasoning: "before-last-message",
      }),
      maxOutputTokens: 1_200,
      temperature: 0.2,
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return Response.json({ status: "ok" });
      }

      const agentResponse = await routeAgentRequest(request, env);
      if (agentResponse) return agentResponse;

      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_failed",
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
