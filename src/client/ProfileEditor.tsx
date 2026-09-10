import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import {
  linesToItems,
  type WorkspaceProfile,
  type WorkspaceProfileInput,
} from "../shared/contracts";
import { PROJECT_TEMPLATES } from "./templates";

function formatTime(value: string | null): string {
  if (!value) return "Not saved yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ProfileEditorProps = {
  profile: WorkspaceProfile;
  disabled: boolean;
  onSave: (profile: WorkspaceProfileInput) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
};

export function ProfileEditor({ profile, disabled, onSave, onDirtyChange }: ProfileEditorProps) {
  const [name, setName] = useState(profile.name);
  const [language, setLanguage] = useState(profile.language);
  const [serviceType, setServiceType] = useState(profile.serviceType);
  const [deploymentRisk, setDeploymentRisk] = useState(profile.deploymentRisk);
  const [ciChecks, setCiChecks] = useState(profile.ciChecks.join("\n"));
  const [standards, setStandards] = useState(profile.standards.join("\n"));
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dirty =
    name !== profile.name ||
    language !== profile.language ||
    serviceType !== profile.serviceType ||
    deploymentRisk !== profile.deploymentRisk ||
    ciChecks !== profile.ciChecks.join("\n") ||
    standards !== profile.standards.join("\n");
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const completeness = [
    name.trim().length >= 2 && name !== "New project",
    !!language.trim(),
    serviceType !== "other",
    !!ciChecks.trim(),
    !!standards.trim(),
  ].filter(Boolean).length;

  useEffect(() => {
    setName(profile.name);
    setLanguage(profile.language);
    setServiceType(profile.serviceType);
    setDeploymentRisk(profile.deploymentRisk);
    setCiChecks(profile.ciChecks.join("\n"));
    setStandards(profile.standards.join("\n"));
  }, [profile.updatedAt]);

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
          <p className="eyebrow">PROJECT MEMORY</p>
          <h2>Project profile</h2>
        </div>
        <span className="saved-time">{formatTime(profile.updatedAt)}</span>
      </div>

      <div className="template-section">
        <span className="field-help">Choose a starting point</span>
        <div className="template-options">
          {PROJECT_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              className="button button-secondary"
              disabled={disabled || isSaving}
              onClick={() => {
                setName(template.name);
                setLanguage(template.language);
                setServiceType(template.serviceType);
                setDeploymentRisk(template.deploymentRisk);
                setCiChecks(template.ciChecks.join("\n"));
                setStandards(template.standards.join("\n"));
                setFeedback("Template applied. Edit the details, then save.");
              }}
            >
              {template.label}
            </button>
          ))}
        </div>
        <div className="profile-progress">
          <span>{completeness} of 5 context fields ready</span>
          <progress max={5} value={completeness} aria-label="Project context completeness" />
        </div>
      </div>

      <label>
        Project name
        <input
          name="project-name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          minLength={2}
          required
        />
      </label>

      <div className="form-row">
        <label>
          Main language
          <input
            name="language"
            autoComplete="off"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="For example: TypeScript"
            maxLength={40}
          />
        </label>

        <label>
          Service type
          <select
            name="service-type"
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
          name="deployment-risk"
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
          name="ci-checks"
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
          name="standards"
          value={standards}
          onChange={(event) => setStandards(event.target.value)}
          placeholder={"Every API change needs an owner\nHigh-risk changes need a rollback plan"}
          rows={5}
        />
        <span className="field-help">Use one standard per line.</span>
      </label>

      <p className="save-state" aria-live="polite">
        {dirty
          ? "Unsaved changes · save to use in your next review"
          : profile.updatedAt
            ? "Saved · remembered across visits"
            : "Save your context for more specific advice"}
      </p>
      <button className="button button-primary" type="submit" disabled={disabled || isSaving}>
        {isSaving ? (
          <LoaderCircle className="button-icon spin" aria-hidden="true" />
        ) : (
          <Save className="button-icon" aria-hidden="true" />
        )}
        {isSaving ? "Saving?" : "Save profile"}
      </button>
      {feedback && (
        <p className="form-feedback" role="status">
          {feedback}
        </p>
      )}
    </form>
  );
}
