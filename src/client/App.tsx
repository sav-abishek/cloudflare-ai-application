import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { EngineeringCodexAgent } from "../server";
import {
  INITIAL_WORKSPACE_STATE,
  LIMITS,
  linesToItems,
  normaliseWorkspaceId,
  type WorkspaceProfile,
  type WorkspaceProfileInput,
  type WorkspaceState,
} from "../shared/contracts";

const EXAMPLE_PROMPTS = [
  "I am adding a payment-refund endpoint. What should I check before review?",
  "Our integration test is flaky. Help me make a safe remediation plan.",
  "What evidence should I collect before a high-risk deployment?",
];

function initialWorkspaceId(): string {
  const query = new URLSearchParams(window.location.search).get("workspace");
  const stored = window.localStorage.getItem("workspace-id");
  return normaliseWorkspaceId(query || stored || "demo-workspace");
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text",
    )
    .map((part) => part.text)
    .join("\n");
}

function formatTime(value: string | null): string {
  if (!value) return "Not saved yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function inlineText(value: string) {
  return value
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={`${part}-${index}`}>{part}</Fragment>
      ),
    );
}

function AssistantMessage({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="assistant-content">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter(Boolean);
        const heading = lines[0]?.match(/^#{1,3}\s+(.+)/);

        if (heading) {
          return <h2 key={`${block}-${blockIndex}`}>{inlineText(heading[1] ?? "")}</h2>;
        }

        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={`${block}-${blockIndex}`}>
              {lines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>{inlineText(line.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={`${block}-${blockIndex}`}>
              {lines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>{inlineText(line.replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return <p key={`${block}-${blockIndex}`}>{inlineText(block)}</p>;
      })}
    </div>
  );
}

type ProfileEditorProps = {
  profile: WorkspaceProfile;
  disabled: boolean;
  onSave: (profile: WorkspaceProfileInput) => Promise<void>;
};

function ProfileEditor({ profile, disabled, onSave }: ProfileEditorProps) {
  const [name, setName] = useState(profile.name);
  const [language, setLanguage] = useState(profile.language);
  const [serviceType, setServiceType] = useState(profile.serviceType);
  const [deploymentRisk, setDeploymentRisk] = useState(profile.deploymentRisk);
  const [ciChecks, setCiChecks] = useState(profile.ciChecks.join("\n"));
  const [standards, setStandards] = useState(profile.standards.join("\n"));
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setName(profile.name);
    setLanguage(profile.language);
    setServiceType(profile.serviceType);
    setDeploymentRisk(profile.deploymentRisk);
    setCiChecks(profile.ciChecks.join("\n"));
    setStandards(profile.standards.join("\n"));
  }, [profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    try {
      await onSave({
        name,
        language,
        serviceType,
        deploymentRisk,
        ciChecks: linesToItems(ciChecks),
        standards: linesToItems(standards),
      });
      setFeedback("Project profile saved.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The profile could not be saved.");
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Durable memory</p>
          <h2>Project profile</h2>
        </div>
        <span className="saved-time">{formatTime(profile.updatedAt)}</span>
      </div>

      <label>
        Project name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          required
        />
      </label>

      <div className="form-row">
        <label>
          Main language
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="For example: TypeScript"
            maxLength={40}
          />
        </label>

        <label>
          Service type
          <select
            value={serviceType}
            onChange={(event) =>
              setServiceType(event.target.value as WorkspaceProfile["serviceType"])
            }
          >
            <option value="web">Web application</option>
            <option value="api">API</option>
            <option value="worker">Worker</option>
            <option value="library">Library</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <label>
        Deployment risk
        <select
          value={deploymentRisk}
          onChange={(event) =>
            setDeploymentRisk(event.target.value as WorkspaceProfile["deploymentRisk"])
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <label>
        Required CI checks
        <textarea
          value={ciChecks}
          onChange={(event) => setCiChecks(event.target.value)}
          placeholder={"Unit tests\nType check\nSecurity scan"}
          rows={4}
        />
        <span className="field-help">Use one check per line.</span>
      </label>

      <label>
        Engineering standards
        <textarea
          value={standards}
          onChange={(event) => setStandards(event.target.value)}
          placeholder={"Every API change needs an owner\nHigh-risk changes need a rollback plan"}
          rows={5}
        />
        <span className="field-help">Use one standard per line.</span>
      </label>

      <button className="button button-primary" type="submit" disabled={disabled}>
        Save profile
      </button>
      {feedback && (
        <p className="form-feedback" role="status">
          {feedback}
        </p>
      )}
    </form>
  );
}

type WorkspaceAppProps = {
  workspaceId: string;
  onSwitchWorkspace: (value: string) => void;
};

function WorkspaceApp({ workspaceId, onSwitchWorkspace }: WorkspaceAppProps) {
  const [connected, setConnected] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState(workspaceId);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback(() => setConnected(true), []);
  const handleClose = useCallback(() => setConnected(false), []);
  const handleError = useCallback(() => {
    setConnected(false);
    setNotice("The connection was interrupted. Please try again.");
  }, []);

  const agent = useAgent<EngineeringCodexAgent, WorkspaceState>({
    agent: "EngineeringCodexAgent",
    name: workspaceId,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
  });

  const { messages, sendMessage, clearHistory, stop, status } = useAgentChat({
    agent,
    experimental_throttle: 80,
  });

  const state = agent.state ?? INITIAL_WORKSPACE_STATE;
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const remainingCharacters = LIMITS.maxInputCharacters - input.length;

  async function saveProfile(profile: WorkspaceProfileInput) {
    await agent.call("updateProfile", [profile]);
  }

  function switchWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSwitchWorkspace(workspaceInput);
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isBusy || !connected) return;

    setNotice("");
    setInput("");

    try {
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    } catch (error) {
      setInput(text);
      setNotice(error instanceof Error ? error.message : "The message could not be sent.");
    }
  }

  async function clearWorkspace() {
    const confirmed = window.confirm(
      "Clear this workspace profile and its chat history? This cannot be undone.",
    );
    if (!confirmed) return;

    setNotice("");
    try {
      await Promise.resolve(clearHistory());
      await agent.call("resetProfile");
      setNotice("Workspace cleared.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The workspace could not be cleared.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Engineering Codex Coach home">
          <span className="brand-mark">EC</span>
          <span>
            <strong>Engineering Codex Coach</strong>
            <small>Built on Cloudflare</small>
          </span>
        </a>

        <div className="connection" aria-live="polite">
          <span className={connected ? "status-dot online" : "status-dot"} />
          {connected ? "Connected" : "Connecting"}
        </div>
      </header>

      <main className="workspace-layout">
        <aside className="sidebar">
          <form className="workspace-picker" onSubmit={switchWorkspace}>
            <label htmlFor="workspace-id">Workspace ID</label>
            <div className="inline-control">
              <input
                id="workspace-id"
                value={workspaceInput}
                onChange={(event) => setWorkspaceInput(event.target.value)}
                maxLength={48}
              />
              <button className="button button-secondary" type="submit">
                Open
              </button>
            </div>
            <p className="field-help">This ID keeps each project's memory separate.</p>
          </form>

          <ProfileEditor profile={state.profile} disabled={!connected} onSave={saveProfile} />

          <div className="safety-note">
            <strong>Keep sensitive data out</strong>
            <p>Do not paste passwords, keys, private code, personal data, or production logs.</p>
          </div>
        </aside>

        <section className="chat-panel" aria-label="Engineering readiness chat">
          <div className="chat-header">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>{state.profile.name}</h1>
              <p>Ask about review readiness, CI failures, or safer delivery.</p>
            </div>
            <button
              className="button button-danger"
              type="button"
              onClick={clearWorkspace}
              disabled={!connected || isBusy}
            >
              Clear workspace
            </button>
          </div>

          <div className="messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✓</span>
                <h2>Prepare your change with confidence</h2>
                <p>Save the project profile, then start with one of these examples.</p>
                <div className="example-list">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      className="example-prompt"
                      key={prompt}
                      type="button"
                      disabled={!connected || isBusy}
                      onClick={() => setInput(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const text = messageText(message);
                if (!text) return null;

                return (
                  <article
                    className={`message ${message.role === "user" ? "message-user" : "message-agent"}`}
                    key={message.id}
                  >
                    <span className="message-label">
                      {message.role === "user" ? "You" : "Codex Coach"}
                    </span>
                    {message.role === "user" ? <p>{text}</p> : <AssistantMessage text={text} />}
                  </article>
                );
              })
            )}
            {isBusy && <p className="thinking">Reviewing the available context...</p>}
            <div ref={messagesEndRef} />
          </div>

          <div className="composer-area">
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            <form className="composer" onSubmit={submitMessage}>
              <label className="sr-only" htmlFor="chat-input">
                Message
              </label>
              <textarea
                id="chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="Describe a change, a failed check, or a delivery question..."
                maxLength={LIMITS.maxInputCharacters}
                rows={3}
                disabled={!connected || isBusy}
              />
              <div className="composer-footer">
                <span>{remainingCharacters.toLocaleString()} characters left</span>
                {isBusy ? (
                  <button className="button button-secondary" type="button" onClick={stop}>
                    Stop
                  </button>
                ) : (
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={!connected || !input.trim()}
                  >
                    Review change
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);

  const updateWorkspace = useCallback((value: string) => {
    const nextId = normaliseWorkspaceId(value);
    window.localStorage.setItem("workspace-id", nextId);
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", nextId);
    window.history.replaceState({}, "", url);
    setWorkspaceId(nextId);
  }, []);

  const workspaceKey = useMemo(() => workspaceId, [workspaceId]);

  return (
    <WorkspaceApp
      key={workspaceKey}
      workspaceId={workspaceId}
      onSwitchWorkspace={updateWorkspace}
    />
  );
}
