import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";
import {
  ArrowRight,
  Cloud,
  FolderOpen,
  ListChecks,
  LoaderCircle,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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
  const lines = text.split("\n");
  const content: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";

    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      content.push(<h2 key={`heading-${index}`}>{inlineText(heading[1] ?? "")}</h2>);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trim() ?? "")) {
        items.push((lines[index]?.trim() ?? "").replace(/^[-*]\s+/, ""));
        index += 1;
      }
      content.push(
        <ul key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{inlineText(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]?.trim() ?? "")) {
        items.push((lines[index]?.trim() ?? "").replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      content.push(
        <ol key={`steps-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{inlineText(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const nextLine = lines[index]?.trim() ?? "";
      if (
        !nextLine ||
        /^#{1,3}\s+/.test(nextLine) ||
        /^[-*]\s+/.test(nextLine) ||
        /^\d+\.\s+/.test(nextLine)
      ) {
        break;
      }
      paragraph.push(nextLine);
      index += 1;
    }
    content.push(<p key={`paragraph-${index}`}>{inlineText(paragraph.join(" "))}</p>);
  }

  return <div className="assistant-content">{content}</div>;
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
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
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

      <button className="button button-primary" type="submit" disabled={disabled || isSaving}>
        {isSaving ? (
          <LoaderCircle className="button-icon spin" aria-hidden="true" />
        ) : (
          <Save className="button-icon" aria-hidden="true" />
        )}
        {isSaving ? "Saving..." : "Save profile"}
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
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const handleOpen = useCallback(() => {
    setConnected(true);
    setNotice((current) =>
      current === "The connection was interrupted. Please try again." ? "" : current,
    );
  }, []);
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
    if (messages.length > 0 || isBusy) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isBusy, messages]);

  const remainingCharacters = LIMITS.maxInputCharacters - input.length;

  function chooseExample(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }

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
        <div className="brand-group">
          <a className="brand" href="/" aria-label="Engineering Codex Coach home">
            <span className="brand-mark" aria-hidden="true">
              <Cloud />
            </span>
            <span>
              <strong>Engineering Codex Coach</strong>
              <small>Built on Cloudflare</small>
            </span>
          </a>
          <span className="product-chip">AI readiness review</span>
        </div>

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
                <FolderOpen className="button-icon" aria-hidden="true" />
                Open
              </button>
            </div>
            <p className="field-help">This ID keeps each project's memory separate.</p>
          </form>

          <ProfileEditor profile={state.profile} disabled={!connected} onSave={saveProfile} />

          <div className="safety-note">
            <ShieldAlert aria-hidden="true" />
            <div>
              <strong>Keep sensitive data out</strong>
              <p>Do not paste passwords, keys, private code, personal data, or production logs.</p>
            </div>
          </div>
        </aside>

        <section className="chat-panel" aria-label="Engineering readiness chat">
          <div className="chat-header">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>{state.profile.name}</h1>
              <p>Ask about review readiness, CI failures, or safer delivery.</p>
              <div className="profile-badges" aria-label="Current project profile">
                <span>{state.profile.language || "Language not set"}</span>
                <span>{state.profile.serviceType}</span>
                <span className={`risk-badge risk-${state.profile.deploymentRisk}`}>
                  {state.profile.deploymentRisk} risk
                </span>
              </div>
            </div>
            <button
              className="button button-danger"
              type="button"
              onClick={clearWorkspace}
              disabled={!connected || isBusy}
            >
              <Trash2 className="button-icon" aria-hidden="true" />
              Clear workspace
            </button>
          </div>

          <div className="messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-intro">
                  <span className="empty-icon" aria-hidden="true">
                    <Sparkles />
                  </span>
                  <p className="eyebrow">AI-assisted delivery review</p>
                  <h2>Ship with fewer surprises</h2>
                  <p>
                    Add project context once. Get a focused readiness assessment, required checks,
                    and practical remediation steps.
                  </p>
                  <div className="capability-grid" aria-label="Assistant capabilities">
                    <div>
                      <ShieldCheck aria-hidden="true" />
                      <span>Assess risk</span>
                    </div>
                    <div>
                      <ListChecks aria-hidden="true" />
                      <span>Check standards</span>
                    </div>
                    <div>
                      <Wrench aria-hidden="true" />
                      <span>Plan remediation</span>
                    </div>
                  </div>
                </div>
                <div className="empty-prompts">
                  <p className="eyebrow">Start with an example</p>
                  <div className="example-list">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        className="example-prompt"
                        key={prompt}
                        type="button"
                        disabled={!connected || isBusy}
                        onClick={() => chooseExample(prompt)}
                      >
                        <span>{prompt}</span>
                        <ArrowRight aria-hidden="true" />
                      </button>
                    ))}
                  </div>
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
            {isBusy && (
              <div className="thinking" role="status">
                <span className="thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                Reviewing the available context...
              </div>
            )}
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
                ref={chatInputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
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
                <div className="composer-meta">
                  <span>{remainingCharacters.toLocaleString()} characters left</span>
                  <span className="model-label">Llama 3.3 · Workers AI</span>
                </div>
                {isBusy ? (
                  <button className="button button-secondary" type="button" onClick={stop}>
                    <Square className="button-icon" aria-hidden="true" />
                    Stop
                  </button>
                ) : (
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={!connected || !input.trim()}
                  >
                    <Send className="button-icon" aria-hidden="true" />
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
