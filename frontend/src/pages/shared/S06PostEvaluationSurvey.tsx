// src/pages/shared/S06PostEvaluationSurvey.tsx
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  observationApi,
  surveyApi,
} from "../../api/endpoints";
import type { ObservationRecord, Survey, Template } from "../../api/types";

export default function S06PostEvaluationSurvey() {
  const { surveyId } = useParams();
  const [searchParams] = useSearchParams();

  const pairingId = Number(searchParams.get("pairingId"));

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [record, setRecord] = useState<ObservationRecord | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [respondentType, setRespondentType] = useState<
    "observer" | "observee" | null
  >(null);
  const [supportingFile, setSupportingFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function normalizeSurveyTemplate(
    value: NonNullable<Survey["template"]>
  ): Template {
    return {
      template_id: value.id,
      name: value.name,
      type: "survey",
      version: value.version,
      status: "published",
      instructions: value.instructions,
      questions: value.questions,
    };
  }

  useEffect(() => {
    async function loadSurvey() {
      setLoading(true);
      setError("");

      try {
        if (surveyId) {
          const result = await surveyApi.detail(Number(surveyId));
          setSurvey(result);
          setRespondentType(result.respondent_type);
          setTemplate(
            result.template ? normalizeSurveyTemplate(result.template) : null
          );
          setResponses(result.responses ?? {});
          return;
        }

        if (!Number.isInteger(pairingId) || pairingId <= 0) {
          throw new Error("Open a survey from Past Evaluations.");
        }
        const effectivePairingId = pairingId;

        const [surveys, records] = await Promise.all([
          surveyApi.list(),
          observationApi.list(),
        ]);

        const existingSurvey = surveys.find(
          (item) => item.pairing_id === effectivePairingId
        );

        if (existingSurvey) {
          setSurvey(existingSurvey);
          setRespondentType(existingSurvey.respondent_type);
          setTemplate(
            existingSurvey.template
              ? normalizeSurveyTemplate(existingSurvey.template)
              : null
          );
          setResponses(existingSurvey.responses ?? {});
          return;
        }

        const matchingRecord = records.find(
          (item) => item.pairing_id === effectivePairingId
        );

        if (!matchingRecord || matchingRecord.status !== "completed") {
          throw new Error("Completed observation record not yet available.");
        }

        setRecord(matchingRecord);
        const result = await surveyApi.templateForPairing(effectivePairingId);
        setRespondentType(result.respondent_type);
        setTemplate(result.template);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Survey not available.");
      } finally {
        setLoading(false);
      }
    }

    void loadSurvey();
  }, [surveyId, pairingId]);

  async function saveSurvey(submit: boolean) {
    if (!template) {
      setError("No published survey template is available.");
      return;
    }

    const activePairingId = survey?.pairing_id ?? record?.pairing_id;

    if (!activePairingId) {
      setError("No observation pairing was selected.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let result: Survey;

      if (survey) {
        result = await surveyApi.update(survey.survey_id, {
          responses,
          submit: false,
        });
      } else {
        result = await surveyApi.submit({
          pairing_id: activePairingId,
          template_id: template.template_id,
          responses,
          submit: false,
        });
      }

      if (supportingFile) {
        result = await surveyApi.uploadSupportingFile(
          result.survey_id,
          supportingFile
        );
        setSupportingFile(null);
      }

      if (submit) {
        result = await surveyApi.update(result.survey_id, {
          responses,
          submit: true,
        });
      }

      setSurvey(result);
      setTemplate(
        result.template ? normalizeSurveyTemplate(result.template) : null
      );
      setResponses(result.responses ?? {});

      setMessage(
        submit ? "Survey submitted successfully." : "Survey draft saved."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save survey.");
    } finally {
      setSaving(false);
    }
  }

  const displayObserver = survey?.observer ?? record?.observer;
  const displayObservee = survey?.observee ?? record?.observee;
  const displayCourse = survey?.course ?? record?.course;
  const displayDate = survey?.observation_datetime ?? record?.confirmed_datetime;
  const canEdit = survey ? survey.can_edit : Boolean(record && template);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">Loading survey...</div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="dashboard-container">
        <p role="alert" className="empty-state-banner">{error}</p>
        <Link to="/shared/current-past-observations" className="btn-secondary">
          Return to Observations
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header matching A03-A08 */}
      <div className="committee-page-header">
        <h2>Post-Evaluation Survey</h2>

        {respondentType && (
          <div className="committee-page-header-meta">
            <span
              className={`status-chip ${
                respondentType === "observer" ? "chip-locked" : "a05-chip-info"
              }`}
            >
              Role: {respondentType === "observer" ? "Observer" : "Observee"}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="empty-state-banner s04-zero-margin" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="feedback-banner-success s04-zero-margin" role="status">
          {message}
        </div>
      )}
      {!canEdit && (
        <div className="s05-completed-banner" role="status">
          This survey has been submitted and is now read-only.
        </div>
      )}

      {/* Pairing Summary Card */}
      <section className="s03-section-card s05-section-accent-primary">
        <div className="s01-card-top-bar">
          <div>
            <h3>Pairing Summary</h3>
            <p className="s01-subtitle">
              Completed peer observation details associated with this survey
            </p>
          </div>
        </div>

        <div className="form-summary-grid-4">
          <div className="form-summary-cell">
            <span className="summary-field-label">Observer</span>
            <p className="summary-field-val">
              {displayObserver?.name ?? "Not available"}
            </p>
          </div>
          <div className="form-summary-cell">
            <span className="summary-field-label">Observee</span>
            <p className="summary-field-val">
              {displayObservee?.name ?? "Not available"}
            </p>
          </div>
          <div className="form-summary-cell">
            <span className="summary-field-label">Course and Section</span>
            <p className="summary-field-val">
              {displayCourse
                ? `${displayCourse.department_code} ${displayCourse.course_number}.${displayCourse.section}`
                : "Not available"}
            </p>
          </div>
          <div className="form-summary-cell">
            <span className="summary-field-label">Observation Date</span>
            <p className="summary-field-val">
              {displayDate
                ? new Date(displayDate).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Not available"}
            </p>
          </div>
        </div>
      </section>

      {/* Survey Main Container */}
      <section className="s03-section-card s05-section-accent-sage">
        <div className="s01-card-top-bar">
          <div>
            <h3>{template?.name ?? "Post-Evaluation Survey"}</h3>
            {template?.instructions && (
              <p className="s01-subtitle">{template.instructions}</p>
            )}
          </div>
          <span className="version-pill">
            {template ? `Version ${template.version}` : "No template"}
          </span>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveSurvey(true);
          }}
        >
          <div className="eval-question-list">
            {template?.questions.map((question, idx) => (
              <div className="eval-question-card" key={question.id}>
                <label className="eval-question-label">
                  <span className="eval-question-num">Q{idx + 1}</span>
                  <span>
                    {question.text}
                    {question.required && (
                      <span className="eval-required-star">*</span>
                    )}
                  </span>
                </label>

                {question.type === "rating" ? (
                  <div className="eval-rating-wrapper">
                    <span className="eval-scale-hint">
                      {question.min ?? 1} (Low)
                    </span>
                    <div className="rating-scale-group">
                      {Array.from(
                        {
                          length:
                            (question.max ?? 5) - (question.min ?? 1) + 1,
                        },
                        (_, index) => (question.min ?? 1) + index
                      ).map((score) => (
                        <button
                          key={score}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            setResponses((previous) => ({
                              ...previous,
                              [question.id]: score,
                            }))
                          }
                          className={`rating-scale-option ${
                            responses[question.id] === score ? "is-selected" : ""
                          } ${!canEdit ? "is-disabled" : ""}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <span className="eval-scale-hint">
                      {question.max ?? 5} (High)
                    </span>
                  </div>
                ) : (
                  <textarea
                    className="eval-textarea"
                    placeholder="Share your feedback here..."
                    value={String(responses[question.id] ?? "")}
                    disabled={!canEdit}
                    required={question.required}
                    onChange={(event) =>
                      setResponses((previous) => ({
                        ...previous,
                        [question.id]: event.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>

          {respondentType === "observee" && (
            <div className="eval-signoff-box">
              <div className="s01-card-top-bar">
                <h4>Optional Supporting Statement or File</h4>
              </div>

              <div className="eval-file-upload-box">
                <p className="s05-signoff-note">
                  Attach an optional document (.pdf, .doc, .docx, or .txt, max 10 MB) to provide additional context about the evaluation process.
                </p>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  disabled={!canEdit || saving}
                  onChange={(event) =>
                    setSupportingFile(event.target.files?.[0] ?? null)
                  }
                />

                {supportingFile && (
                  <p
                    className="feedback-banner-success s04-zero-margin"
                    role="status"
                  >
                    Selected file: {supportingFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="eval-form-actions">
            {canEdit ? (
              <div className="form-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => void saveSurvey(false)}
                >
                  Save Draft
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Survey"}
                </button>
              </div>
            ) : (
              <p className="s05-signoff-note">
                This survey has been submitted and cannot be edited.
              </p>
            )}
          </div>
        </form>
      </section>

      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}