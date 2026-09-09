import type { UIMessage } from "ai";
import {
  LIMITS,
  workspaceProfileInputSchema,
  type WorkspaceProfileInput,
} from "../shared/contracts";

export function parseWorkspaceProfile(input: unknown): WorkspaceProfileInput {
  return workspaceProfileInputSchema.parse(input);
}

export function latestUserText(messages: UIMessage[]): string {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage) return "";

  return latestUserMessage.parts
    .filter(
      (part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function assertSafeMessage(text: string): void {
  if (!text) {
    throw new Error("Please enter a message before sending.");
  }

  if (text.length > LIMITS.maxInputCharacters) {
    throw new Error(
      `Your message is too long. Keep it below ${LIMITS.maxInputCharacters.toLocaleString()} characters.`,
    );
  }
}
