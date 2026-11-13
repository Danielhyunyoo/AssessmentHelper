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
  const canEdit = survey
    ? survey.can_edit
    : Boolean(record && template);

  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Loading survey...</p>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="dashboard-container">
        <p role="alert">{error}</p>
        <Link to="/shared/current-past-observations">
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

      <div className="notif-page-header-row" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Post-Evaluation Survey</h2>
        {respondentType && (
          <span
            className={`pill-badge ${
              respondentType === "observer" ? "pill-observer" : "pill-observee"
            }`}
          >
            Role: {respondentType === "observer" ? "Observer" : "Observee"}
          </span>
        )}
      </div>

      {error && (
        <div className="empty-state-banner" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="feedback-banner-success" role="status">
          {message}
        </div>
      )}

      {/* Pairing Summary Card */}
      <section className="table-container theme-orange summary-card-padding">
        <h3 className="card-heading-md" style={{ marginBottom: "0.25rem" }}>
          Pairing Summary
        </h3>
        <p className="card-subtext font-slate" style={{ margin: 0 }}>
          Completed peer observation details associated with this survey
        </p>

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
            <span className="summary-field-label">Course &amp; Section</span>
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
      <section className="table-container theme-green summary-card-padding">
        <div className="form-header-row">
          <h3 className="card-heading-md margin-none">
            {template?.name ?? "Post-Evaluation Survey"}
          </h3>
          <span className="version-pill">
            {template ? `Version ${template.version}` : "No template"}
          </span>
        </div>

        <p className="form-instruction-subtext">{template?.instructions}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveSurvey(true);
          }}
        >
          <div className="eval-question-list">
            {template?.questions.map((question, idx) => (
              <div className="eval-question-card" key={question.id}>
                <div className="eval-question-top">
                  <span className="eval-question-num">Q{idx + 1}</span>
                  <label className="eval-question-text">
                    {question.text}
                    {question.required && (
                      <span className="eval-required-star">*</span>
                    )}
                  </label>
                </div>

                {question.type === "rating" ? (
                  <div className="eval-rating-wrapper">
                    <span className="eval-scale-hint">
                      {question.min ?? 1} (Low)
                    </span>
                    <div className="rating-btn-row" style={{ marginTop: 0 }}>
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
                          className={`rating-score-btn ${
                            responses[question.id] === score ? "selected" : ""
                          }`}
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
                    className="fixed-height-textarea"
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
            <div
              className="form-section-block-sm"
              style={{ marginTop: "2rem" }}
            >
              <h4 className="section-subtitle">
                Optional Supporting Statement or File
              </h4>

              <div className="eval-file-upload-box">
                <p
                  className="observation-card-text"
                  style={{ margin: 0 }}
                >
                  Attach an optional document (`.pdf`, `.doc`, `.docx`, or
                  `.txt`, max 10 MB) to provide additional context about the
                  evaluation process.
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
                    className="feedback-banner-success"
                    style={{ margin: 0 }}
                    role="status"
                  >
                    Selected file: {supportingFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <div
            className="form-footer-toolbar"
            style={{ justifyContent: "flex-end" }}
          >
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
              <p className="observation-card-subtext" style={{ margin: 0 }}>
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