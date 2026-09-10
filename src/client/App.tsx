import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Command,
  FileCheck2,
  FolderOpen,
  GitPullRequest,
  Layers3,
  LoaderCircle,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { EngineeringCodexAgent } from "../server";
import {
  INITIAL_WORKSPACE_STATE,
  LIMITS,
  normaliseWorkspaceId,
  type WorkspaceProfileInput,
  type WorkspaceState,
} from "../shared/contracts";
import { reviewDecision } from "../shared/readiness";
import { AssistantMessage } from "./AssistantMessage";
const ProfileEditor = lazy(() =>
  import("./ProfileEditor").then((module) => ({ default: module.ProfileEditor })),
);
const ReviewCard = lazy(() =>
  import("./ReviewCard").then((module) => ({ default: module.ReviewCard })),
);
type View = "review" | "evidence" | "context";
const NAV = [
  { id: "review", label: "Change review", icon: GitPullRequest },
  { id: "evidence", label: "Evidence board", icon: FileCheck2 },
  { id: "context", label: "Project context", icon: SlidersHorizontal },
] as const;
const EXAMPLES = [
  {
    title: "Review a change",
    description: "Find the checks that matter.",
    icon: GitPullRequest,
    prompt: "I am adding a payment-refund endpoint. What should I check before review?",
  },
  {
    title: "Unblock a build",
    description: "Turn a failure into a plan.",
    icon: Activity,
    prompt: "Our integration test is flaky. Help me make a safe remediation plan.",
  },
  {
    title: "Plan a release",
    description: "Know what ready looks like.",
    icon: Layers3,
    prompt: "What evidence should I collect before a high-risk deployment?",
  },
];
function readView(): View {
  const v = new URLSearchParams(window.location.search).get("view");
  return v === "context" || v === "evidence" ? v : "review";
}
function initialWorkspaceId(): string {
  const query = new URLSearchParams(window.location.search).get("workspace");
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem("workspace-id");
  } catch {
    /* Storage may be disabled. */
  }
  return normaliseWorkspaceId(query || stored || `workspace-${crypto.randomUUID().slice(0, 12)}`);
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text",
    )
    .map((part) => part.text)
    .join("\n");
}

// Keep the identity stable if the chat SDK suspends the first React render.
const STARTING_WORKSPACE_ID = initialWorkspaceId();

type WorkspaceAppProps = {
  workspaceId: string;
  onSwitchWorkspace: (value: string) => void;
};

function WorkspaceApp({ workspaceId, onSwitchWorkspace }: WorkspaceAppProps) {
  const [connected, setConnected] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState(workspaceId);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>(readView);
  const [visited, setVisited] = useState(() => new Set<View>([readView()]));
  const [profileDirty, setProfileDirty] = useState(false);
  const [evidenceDirty, setEvidenceDirty] = useState(false);
  const workspaceDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const conversationSizeRef = useRef({ height: 0, content: 0 });
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

  const { messages, sendMessage, clearHistory, stop, status, error, regenerate } = useAgentChat({
    agent,
    experimental_throttle: 80,
    cancelOnClientAbort: true,
  });

  const state = agent.state ?? INITIAL_WORKSPACE_STATE;
  const isBusy = status === "submitted" || status === "streaming";
  const hasMessages = messages.some((message) => !!messageText(message));

  function scrollToLatest() {
    followLatestRef.current = true;
    const container = conversationRef.current;
    if (container) {
      conversationSizeRef.current = {
        height: container.clientHeight,
        content: container.scrollHeight,
      };
      container.scrollTop = container.scrollHeight;
    }
  }
  useLayoutEffect(() => {
    if (view === "review" && followLatestRef.current) scrollToLatest();
  }, [isBusy, messages, view, state.review?.id]);
  useLayoutEffect(() => {
    const container = conversationRef.current;
    if (!container || view !== "review") return;
    const observer = new ResizeObserver(() => {
      if (followLatestRef.current) scrollToLatest();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [view, hasMessages]);
  useLayoutEffect(() => {
    if (mainColumnRef.current) mainColumnRef.current.scrollTop = 0;
  }, [view]);

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
    if (
      (profileDirty || evidenceDirty || input.trim()) &&
      !window.confirm("Discard unsaved edits and switch workspace?")
    )
      return;
    workspaceDialog.current?.close();
    onSwitchWorkspace(workspaceInput);
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isBusy || !connected) return;
    if (evidenceDirty && !window.confirm("Run a new review and discard unsaved evidence edits?"))
      return;

    setNotice("");
    setInput("");
    followLatestRef.current = true;
    requestAnimationFrame(scrollToLatest);

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

  const review = state.review;
  const completed = review?.checks.filter((check) => check.evidence).length ?? 0;
  const stale = !!review && review.profileUpdatedAt !== state.profile.updatedAt;
  function navigate(next: View) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.pushState({}, "", url);
    setView(next);
    setVisited((current) => new Set(current).add(next));
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }
  useEffect(() => {
    const pop = () => {
      const next = readView();
      setView(next);
      setVisited((current) => new Set(current).add(next));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!profileDirty && !evidenceDirty && !input.trim()) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [profileDirty, evidenceDirty, input]);

  const composer = (
    <div className="composer-wrap">
      {error && (
        <div className="inline-alert" role="alert">
          <span>The review could not finish. {error.message}</span>
          <button
            className="text-button"
            disabled={!connected || isBusy}
            onClick={() =>
              void regenerate().catch(() => setNotice("Retry failed. Please try again shortly."))
            }
          >
            <RotateCcw />
            Retry review
          </button>
        </div>
      )}
      <form className="composer" onSubmit={submitMessage}>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          name="message"
          ref={chatInputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submitMessage();
            }
          }}
          placeholder={
            hasMessages
              ? "Ask a follow-up or describe your next change…"
              : "Describe your change. What are you building or fixing?"
          }
          maxLength={LIMITS.maxInputCharacters}
          rows={3}
        />
        <div className="composer-toolbar">
          <button type="button" className="context-token" onClick={() => navigate("context")}>
            <Layers3 />
            {state.profile.updatedAt ? state.profile.name : "Add project context"}
            <Plus />
          </button>
          {isBusy ? (
            <button className="send-button" type="button" onClick={stop}>
              <Square />
              Stop
            </button>
          ) : (
            <button className="send-button" type="submit" disabled={!connected || !input.trim()}>
              <span>Review change</span>
              <ArrowUp />
            </button>
          )}
        </div>
      </form>
      <div className="composer-caption">
        <span>
          <span className="tiny-dot" />
          Llama 3.3 <span className="caption-divider">/</span> Workers AI
        </span>
        <span>
          {remainingCharacters < 1000
            ? `${remainingCharacters} characters left`
            : "Enter to send · Shift+Enter for a new line"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="app-nav" aria-label="Workspace navigation">
        <a
          className="brand"
          href={`/?workspace=${workspaceId}`}
          aria-label="Engineering Codex Coach home"
        >
          <span className="brand-mark">
            <Command aria-hidden="true" />
          </span>
          <span>
            codex<span className="brand-light">coach</span>
            <small>ENGINEERING READINESS</small>
          </span>
        </a>
        <button
          className="workspace-switch"
          onClick={() => {
            setWorkspaceInput(workspaceId);
            workspaceDialog.current?.showModal();
          }}
        >
          <span className="project-avatar">{state.profile.name.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{state.profile.name}</strong>
            <small>Personal workspace</small>
          </span>
          <ChevronDown />
        </button>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`?workspace=${workspaceId}&view=${item.id}`}
              className={`nav-link ${view === item.id ? "active" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={(event) => {
                if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
                  event.preventDefault();
                  navigate(item.id);
                }
              }}
            >
              <item.icon />
              <span>{item.label}</span>
              {item.id === "evidence" && review && (
                <span className="nav-count" aria-hidden="true">
                  {review.checks.length - completed}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="nav-note">
          <span className="nav-note-mark">
            <ShieldCheck />
          </span>
          <strong>Context stays with you.</strong>
          <p>Your standards, conversations, and evidence. Ready when you return.</p>
          <button className="nav-note-link" onClick={() => navigate("context")}>
            Manage context <ArrowUpRight />
          </button>
        </div>
        <div className="nav-bottom">
          <button className="nav-link" onClick={() => helpDialog.current?.showModal()}>
            <CircleHelp />
            <span>Quick guide</span>
            <ArrowUpRight />
          </button>
          <div className="platform-credit">
            <Cloud />
            <span>Built on Cloudflare</span>
            <span className="version-label">BETA</span>
          </div>
        </div>
      </aside>
      <div className="workspace-shell">
        <header className="workspace-topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span>/</span>
            <strong>{NAV.find((item) => item.id === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="connection" role="status">
              <span className={`status-dot ${connected ? "online" : ""}`} />
              {connected ? "Connected" : "Reconnecting…"}
            </span>
            <button
              className="icon-button help-shortcut"
              aria-label="Open quick guide"
              onClick={() => helpDialog.current?.showModal()}
            >
              <CircleHelp />
            </button>
            <span className="user-avatar" aria-label="Personal workspace">
              YOU
            </span>
          </div>
        </header>
        <main
          id="main-content"
          className={`main-layout view-${view} ${hasMessages && view === "review" ? "chat-active" : ""}`}
          tabIndex={-1}
        >
          <div
            className="main-column"
            ref={mainColumnRef}
            tabIndex={0}
            role="region"
            aria-label="Workspace content"
          >
            <header className="page-heading">
              <div>
                <p className="eyebrow">
                  {view === "review"
                    ? "THE REVIEW WORKSPACE"
                    : view === "evidence"
                      ? "FROM ADVICE TO ACTION"
                      : "BETTER CONTEXT. BETTER ADVICE."}
                </p>
                <h1 ref={titleRef} tabIndex={-1}>
                  {view === "review"
                    ? "Change review"
                    : view === "evidence"
                      ? "Evidence board"
                      : "Project context"}
                </h1>
              </div>
              {view === "review" ? (
                <span className="page-marker">
                  <span />
                  AI ASSISTED
                </span>
              ) : (
                <button className="text-button" onClick={() => navigate("review")}>
                  Back to review
                  <ArrowUpRight />
                </button>
              )}
            </header>
            {notice && (
              <div className="inline-alert" role="status">
                <span>{notice}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss notification"
                  onClick={() => setNotice("")}
                >
                  <X />
                </button>
              </div>
            )}
            <section
              hidden={view !== "review"}
              className={`review-view ${hasMessages ? "has-conversation" : ""}`}
              aria-label="Change review"
            >
              {!hasMessages ? (
                <div className="welcome">
                  <div className="welcome-copy">
                    <span className="welcome-label">
                      <span className="orange-mark">
                        <ArrowUpRight />
                      </span>
                      A little clarity before your next release.
                    </span>
                    <h2>
                      Good changes.
                      <br />
                      <span>Ready to ship.</span>
                    </h2>
                    <p>
                      Turn a change idea into a clear path forward.
                      <br className="desktop-break" /> Get the checks, the risks, and your next
                      move.
                    </p>
                  </div>
                  {composer}
                  <div className="starter-heading">
                    <span>A PLACE TO START</span>
                    <span>Choose a prompt. Make it yours.</span>
                  </div>
                  <div className="starter-grid">
                    {EXAMPLES.map((example) => (
                      <button
                        className="starter-card"
                        key={example.title}
                        onClick={() => chooseExample(example.prompt)}
                      >
                        <example.icon />
                        <strong>{example.title}</strong>
                        <span>{example.description}</span>
                        <ArrowUpRight className="starter-arrow" />
                      </button>
                    ))}
                  </div>
                  <div className="welcome-footnote">
                    <ShieldCheck />
                    <span>Built for thoughtful engineering. Final decisions stay with you.</span>
                  </div>
                </div>
              ) : (
                <>
                  {review && (
                    <button
                      className={`result-strip ${stale ? "result-stale" : ""}`}
                      onClick={() => navigate("evidence")}
                    >
                      <FileCheck2 />
                      <span>
                        <strong>{reviewDecision(review, stale)}</strong>
                        <small>
                          {stale
                            ? "Project context changed. Run a new review."
                            : `${completed} of ${review.checks.length} checks have user evidence`}
                        </small>
                      </span>
                      <span className="result-link">
                        Open evidence <ArrowUpRight />
                      </span>
                    </button>
                  )}
                  <div
                    className="conversation"
                    ref={conversationRef}
                    tabIndex={0}
                    onScroll={(event) => {
                      const el = event.currentTarget;
                      if (view !== "review" || el.clientHeight === 0) return;
                      const previous = conversationSizeRef.current;
                      conversationSizeRef.current = {
                        height: el.clientHeight,
                        content: el.scrollHeight,
                      };
                      // Layout changes also emit scroll events; preserve the reader's intent.
                      if (
                        previous.height !== el.clientHeight ||
                        previous.content !== el.scrollHeight
                      )
                        return;
                      followLatestRef.current =
                        el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                    }}
                    role="log"
                    aria-label="Review conversation"
                    aria-live="polite"
                  >
                    {messages.map((message) => {
                      const text = messageText(message);
                      if (!text) return null;
                      return (
                        <article
                          className={`message message-${message.role === "user" ? "user" : "agent"}`}
                          key={message.id}
                        >
                          <div className="message-heading">
                            <span className="message-avatar">
                              {message.role === "user" ? "Y" : <Command />}
                            </span>
                            <strong>{message.role === "user" ? "You" : "Codex Coach"}</strong>
                            {message.role !== "user" && (
                              <span className="message-tag">REVIEW NOTES</span>
                            )}
                          </div>
                          {message.role === "user" ? (
                            <p>{text}</p>
                          ) : (
                            <AssistantMessage text={text} />
                          )}
                        </article>
                      );
                    })}
                    {isBusy && (
                      <div className="thinking" role="status">
                        <LoaderCircle className="spin" />
                        Reviewing your change and project context…
                      </div>
                    )}
                  </div>
                  <button className="conversation-bottom text-button" onClick={scrollToLatest}>
                    <ArrowDown />
                    Latest message
                  </button>
                  {composer}
                </>
              )}
            </section>
            <section
              hidden={view !== "evidence"}
              className="evidence-view"
              aria-label="Evidence board"
            >
              {review ? (
                <>
                  <p className="page-description">
                    A practical checklist for your next human review. Add evidence as you go.
                  </p>
                  {visited.has("evidence") && (
                    <Suspense
                      fallback={
                        <p className="panel-loading" role="status">
                          Opening your evidence board…
                        </p>
                      }
                    >
                      <ReviewCard
                        key={review.id}
                        review={review}
                        stale={stale}
                        disabled={!connected || isBusy}
                        onDirtyChange={setEvidenceDirty}
                        onEvidence={async (checkId, evidence) => {
                          await agent.call("updateEvidence", [
                            { reviewId: review.id, checkId, evidence },
                          ]);
                        }}
                        onFeedback={async (value) => {
                          await agent.call("reviewFeedback", [{ reviewId: review.id, value }]);
                        }}
                      />
                    </Suspense>
                  )}
                </>
              ) : (
                <div className="board-empty">
                  <span className="empty-board-icon">
                    <FileCheck2 />
                  </span>
                  <span className="eyebrow">YOUR NEXT STEP</span>
                  <h2>
                    Every check starts
                    <br />
                    with a change.
                  </h2>
                  <p>
                    Describe what you’re building. Your completed AI review will create a checklist
                    here, ready for evidence.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={() => {
                      navigate("review");
                      requestAnimationFrame(() => chatInputRef.current?.focus());
                    }}
                  >
                    Review a change <ArrowRight />
                  </button>
                  <div className="empty-checks" aria-hidden="true">
                    <span>
                      <i />
                      Required checks
                    </span>
                    <span>
                      <i />
                      Supporting evidence
                    </span>
                    <span>
                      <i />A clear next action
                    </span>
                  </div>
                </div>
              )}
            </section>
            <section
              hidden={view !== "context"}
              className="context-view"
              aria-label="Project context"
            >
              <p className="page-description">
                Teach your coach how this project ships. Save once, use it in every review.
              </p>
              {visited.has("context") && (
                <Suspense
                  fallback={
                    <p className="panel-loading" role="status">
                      Opening project context…
                    </p>
                  }
                >
                  <ProfileEditor
                    profile={state.profile}
                    disabled={!connected || isBusy}
                    onSave={saveProfile}
                    onDirtyChange={setProfileDirty}
                  />
                </Suspense>
              )}
              <div className="danger-zone">
                <div>
                  <strong>Start over in this workspace</strong>
                  <p>Remove its profile, conversation, and saved review.</p>
                </div>
                <button
                  className="text-button danger-text"
                  disabled={!connected || isBusy}
                  onClick={clearWorkspace}
                >
                  <Trash2 />
                  Clear workspace
                </button>
              </div>
            </section>
          </div>
          <aside className="context-rail" aria-label="Review context">
            <div className="rail-heading">
              <span>IN THIS WORKSPACE</span>
              <Layers3 />
            </div>
            <div className="rail-project">
              <span className="project-avatar">{state.profile.name.slice(0, 1).toUpperCase()}</span>
              <h2>{state.profile.name}</h2>
              <p>
                {state.profile.language || "Add your project language"} <span>·</span>{" "}
                {state.profile.serviceType === "other" ? "Project" : state.profile.serviceType}
              </p>
              <span className={`risk-pill risk-${state.profile.deploymentRisk}`}>
                <span />
                {state.profile.deploymentRisk} deployment risk
              </span>
            </div>
            <div className="rail-section">
              <div className="rail-section-heading">
                <h3>Project memory</h3>
                <button
                  className="icon-button"
                  aria-label="Edit project context"
                  onClick={() => navigate("context")}
                >
                  <SlidersHorizontal />
                </button>
              </div>
              <div className="memory-stat">
                <span>Required checks</span>
                <strong>{String(state.profile.ciChecks.length).padStart(2, "0")}</strong>
              </div>
              <div className="memory-stat">
                <span>Engineering standards</span>
                <strong>{String(state.profile.standards.length).padStart(2, "0")}</strong>
              </div>
              <span className="memory-saved">
                {state.profile.updatedAt ? (
                  <>
                    <Check />
                    Saved to this workspace
                  </>
                ) : (
                  <>No saved context yet</>
                )}
              </span>
            </div>
            <div className="rail-section">
              <h3>Your review path</h3>
              <ol className="review-path">
                <li className={state.profile.updatedAt ? "step-done" : ""}>
                  <span>{state.profile.updatedAt ? <Check /> : "01"}</span>
                  <div>
                    <strong>Set the context</strong>
                    <p>Your project’s own standards.</p>
                  </div>
                </li>
                <li className={review ? "step-done" : ""}>
                  <span>{review ? <Check /> : "02"}</span>
                  <div>
                    <strong>Review the change</strong>
                    <p>Find risks and next steps.</p>
                  </div>
                </li>
                <li
                  className={
                    review && completed === review.checks.length && !stale ? "step-done" : ""
                  }
                >
                  <span>03</span>
                  <div>
                    <strong>Bring the evidence</strong>
                    <p>
                      {review
                        ? `${completed}/${review.checks.length} checks documented.`
                        : "A checklist you can act on."}
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="rail-tip">
              <span>THE HUMAN PART</span>
              <p>
                Good judgment
                <br />
                stays in the loop.
              </p>
              <small>
                Evidence is user-supplied. Your coach helps prepare the review; your team makes the
                call.
              </small>
            </div>
            <p className="privacy-note">
              Public demo · Keep private code, credentials, and production data out.
            </p>
          </aside>
        </main>
      </div>
      <dialog ref={workspaceDialog} className="app-dialog" aria-labelledby="workspace-dialog-title">
        <div className="dialog-heading">
          <span className="eyebrow">YOUR WORKSPACES</span>
          <button
            className="icon-button"
            aria-label="Close workspace switcher"
            onClick={() => workspaceDialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <h2 id="workspace-dialog-title">Pick up where you left off.</h2>
        <p>Open an existing workspace by its ID, or start with a clean slate.</p>
        <form onSubmit={switchWorkspace}>
          <label htmlFor="workspace-id">Workspace ID</label>
          <div className="inline-control">
            <input
              id="workspace-id"
              name="workspace-id"
              autoComplete="off"
              spellCheck={false}
              value={workspaceInput}
              onChange={(event) => setWorkspaceInput(event.target.value)}
              maxLength={48}
              required
            />
            <button className="button button-primary" type="submit">
              <FolderOpen />
              Open
            </button>
          </div>
        </form>
        <button
          className="button button-secondary new-workspace"
          onClick={() => {
            if (
              (profileDirty || evidenceDirty || input.trim()) &&
              !window.confirm("Discard unsaved edits and create a new workspace?")
            )
              return;
            workspaceDialog.current?.close();
            onSwitchWorkspace(`workspace-${crypto.randomUUID().slice(0, 12)}`);
          }}
        >
          <Plus />
          New workspace
        </button>
        <p className="field-help">
          Anyone with a workspace ID can access it. Use synthetic demo data.
        </p>
      </dialog>
      <dialog ref={helpDialog} className="app-dialog" aria-labelledby="help-title">
        <div className="dialog-heading">
          <span className="eyebrow">A QUICK TOUR</span>
          <button
            className="icon-button"
            aria-label="Close quick guide"
            onClick={() => helpDialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <h2 id="help-title">From change to clarity.</h2>
        <ol className="help-steps">
          <li>
            <strong>Add project context.</strong>
            <p>Choose a template, edit your standards, and save.</p>
          </li>
          <li>
            <strong>Describe a change.</strong>
            <p>Ask your coach for risks, checks, and remediation.</p>
          </li>
          <li>
            <strong>Collect the evidence.</strong>
            <p>Document results on the Evidence board, then copy or download your checklist.</p>
          </li>
        </ol>
        <p className="field-help">
          Your workspace remembers your work. Each new completed review replaces the previous
          checklist. Evidence is self-reported; the coach has no repository or CI access.
        </p>
      </dialog>
    </div>
  );
}

export default function App() {
  const [workspaceId, setWorkspaceId] = useState(STARTING_WORKSPACE_ID);

  useEffect(() => {
    try {
      window.localStorage.setItem("workspace-id", workspaceId);
    } catch {
      /* URL still preserves the workspace. */
    }
    const url = new URL(window.location.href);
    url.searchParams.set("workspace", workspaceId);
    window.history.replaceState({}, "", url);
  }, [workspaceId]);

  const updateWorkspace = useCallback(
    (value: string) => {
      const nextId = normaliseWorkspaceId(value);
      try {
        window.localStorage.setItem("workspace-id", nextId);
      } catch {
        /* URL remains available. */
      }
      const url = new URL(window.location.href);
      url.searchParams.set("workspace", nextId);
      if (nextId !== workspaceId) url.searchParams.delete("view");
      window.history.replaceState({}, "", url);
      setWorkspaceId(nextId);
    },
    [workspaceId],
  );

  const workspaceKey = useMemo(() => workspaceId, [workspaceId]);

  return (
    <Suspense
      fallback={
        <div className="workspace-loading" role="status">
          <Cloud aria-hidden="true" />
          <h1>Engineering Codex Coach</h1>
          <p>Opening your workspace…</p>
        </div>
      }
    >
      <WorkspaceApp
        key={workspaceKey}
        workspaceId={workspaceId}
        onSwitchWorkspace={updateWorkspace}
      />
    </Suspense>
  );
}
