import { useEffect, useState } from "react";
import { CheckCheck, Copy, Download, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { reviewDecision, reviewMarkdown, type ReadinessReview } from "../shared/readiness";

type Props = {
  review: ReadinessReview;
  stale: boolean;
  disabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onEvidence: (checkId: string, evidence: string) => Promise<void>;
  onFeedback: (value: "helpful" | "not-helpful") => Promise<void>;
};

export function ReviewCard({
  review,
  stale,
  disabled,
  onEvidence,
  onFeedback,
  onDirtyChange,
}: Props) {
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const dirty = review.checks.some(
    (check) => drafts[check.id] !== undefined && drafts[check.id] !== check.evidence,
  );
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const completed = review.checks.filter((check) => check.evidence).length;
  const next = review.checks.find((check) => !check.evidence);
  async function act(action: () => Promise<void>, success: string) {
    setPending(true);
    try {
      await action();
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save. Try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className={`review-card ${stale ? "review-stale" : completed === review.checks.length ? "review-ready" : ""}`}
      aria-label="Latest readiness result"
    >
      <div className="review-heading">
        <div>
          <p className="eyebrow">Latest readiness result</p>
          <h2>
            <ShieldCheck aria-hidden="true" />
            {reviewDecision(review, stale)}
          </h2>
        </div>
        <span className="review-count">
          {completed}/{review.checks.length} evidenced
        </span>
      </div>
      <progress
        className="evidence-progress"
        value={completed}
        max={review.checks.length}
        aria-label="Checks with user evidence"
      />
      <p className="review-context">
        Based on {review.projectName} · {review.risk} risk ·{" "}
        {new Date(review.createdAt).toLocaleString()}
      </p>
      {review.changeDescription && (
        <details className="review-source">
          <summary>Reviewed change</summary>
          <p>{review.changeDescription}</p>
        </details>
      )}
      <p className="next-action">
        <strong>Next action</strong>{" "}
        {stale
          ? "Your profile changed. Run a new review to refresh these checks."
          : (next?.label ?? "Share your evidence with a human reviewer.")}
      </p>
      <details className="evidence-details" open>
        <summary>
          <CheckCheck className="button-icon" aria-hidden="true" /> Required evidence{" "}
          <span>{review.checks.length - completed} remaining</span>
        </summary>
        <p className="field-help">
          Add a result or reference for each check. Saving evidence marks it complete; clearing it
          reopens the check.
        </p>
        <div className="evidence-filters" aria-label="Filter evidence checks">
          <button type="button" aria-pressed={!onlyPending} onClick={() => setOnlyPending(false)}>
            All checks ({review.checks.length})
          </button>
          <button type="button" aria-pressed={onlyPending} onClick={() => setOnlyPending(true)}>
            Needs evidence ({review.checks.length - completed})
          </button>
        </div>
        {onlyPending && completed === review.checks.length && (
          <p className="form-feedback">
            Every check has evidence. Your checklist is ready for a human review.
          </p>
        )}
        {review.checks
          .filter((check) => !onlyPending || !check.evidence)
          .map((check) => (
            <form
              key={check.id}
              className="evidence-item"
              onSubmit={(event) => {
                event.preventDefault();
                const evidence = String(new FormData(event.currentTarget).get("evidence") ?? "");
                void act(async () => {
                  await onEvidence(check.id, evidence);
                  setDrafts((current) => {
                    const nextDrafts = { ...current };
                    delete nextDrafts[check.id];
                    return nextDrafts;
                  });
                }, "Evidence saved to this workspace.");
              }}
            >
              <label>
                <span>
                  {check.evidence ? "✓" : "○"} {check.label}
                </span>
                <input
                  name="evidence"
                  value={drafts[check.id] ?? check.evidence}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [check.id]: event.target.value }))
                  }
                  maxLength={500}
                  placeholder="Result or reference, e.g. CI run #142 passed"
                  disabled={disabled || stale || pending}
                />
              </label>
              <button
                type="submit"
                className="button button-secondary"
                disabled={disabled || stale || pending}
              >
                Save
              </button>
            </form>
          ))}
      </details>
      <p className="review-assumptions">
        User-supplied evidence. No repository or CI access. Readiness supports human review; it does
        not approve a deployment.
      </p>
      <div className="review-actions">
        <button
          className="button button-secondary"
          onClick={() =>
            void act(
              () => navigator.clipboard.writeText(reviewMarkdown(review, stale)),
              "Review checklist copied.",
            )
          }
          disabled={pending}
        >
          <Copy className="button-icon" aria-hidden="true" />
          Copy checklist
        </button>
        <button
          className="button button-secondary"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([reviewMarkdown(review, stale)], { type: "text/markdown;charset=utf-8" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "readiness-review.md";
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice("Review downloaded.");
          }}
        >
          <Download className="button-icon" aria-hidden="true" />
          Download
        </button>
        <div className="feedback-actions" aria-label="Was this review helpful?">
          <button
            className="button button-secondary"
            aria-label="Helpful"
            aria-pressed={review.feedback === "helpful"}
            disabled={disabled || pending}
            onClick={() => void act(() => onFeedback("helpful"), "Thanks. Feedback saved.")}
          >
            <ThumbsUp className="button-icon" aria-hidden="true" />
          </button>
          <button
            className="button button-secondary"
            aria-label="Not helpful"
            aria-pressed={review.feedback === "not-helpful"}
            disabled={disabled || pending}
            onClick={() => void act(() => onFeedback("not-helpful"), "Thanks. Feedback saved.")}
          >
            <ThumbsDown className="button-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
      {notice && (
        <p className="form-feedback" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
