import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { observationApi, surveyApi } from "../../api/endpoints";
import type { ObservationRecord, Survey, Template } from "../../api/types";

export default function S06PostEvaluationSurvey() {
  const { surveyId } = useParams();
  const [searchParams] = useSearchParams();

  const pairingId = Number(searchParams.get("pairingId"));

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [record, setRecord] = useState<ObservationRecord | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});

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
      try {
        setLoading(true);
        setError("");

        if (surveyId) {
          const result = await surveyApi.detail(Number(surveyId));
          setSurvey(result);
          setTemplate(
            result.template
              ? normalizeSurveyTemplate(result.template)
              : null
          );
          setResponses(result.responses ?? {});
          return;
        }

        if (!Number.isInteger(pairingId) || pairingId <= 0) {
          setError(
            "Open the survey from a completed observation record to select its pairing."
          );
          return;
        }

        const [surveys, records] = await Promise.all([
          surveyApi.list(),
          observationApi.list(),
        ]);

        const existingSurvey = surveys.find(
          (item) => item.pairing_id === pairingId
        );

        if (existingSurvey) {
          setSurvey(existingSurvey);

          setTemplate(
            existingSurvey.template
              ? normalizeSurveyTemplate(existingSurvey.template)
              : null
          );

          setResponses(existingSurvey.responses ?? {});
        } else {
          const matchingRecord = records.find(
            (item) => item.pairing_id === pairingId
          );

          if (!matchingRecord || matchingRecord.status !== "completed") {
            setError(
              "A completed, fully signed observation record is required before completing this survey."
            );
            return;
          }

          setRecord(matchingRecord);

          const result = await surveyApi.templateForPairing(pairingId);
          setTemplate(result.template);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load survey."
        );
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
          submit,
        });
      } else {
        result = await surveyApi.submit({
          pairing_id: activePairingId,
          template_id: template.template_id,
          responses,
          submit,
        });
      }

      setSurvey(result);
      setTemplate(
        result.template
          ? normalizeSurveyTemplate(result.template)
          : null
      );
      setResponses(result.responses ?? {});

      setMessage(
        submit ? "Survey submitted successfully." : "Survey draft saved."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save survey."
      );
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
      {/* Top Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Post-Evaluation Survey</h2>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* Pairing Summary Box */}
      <section className="table-container theme-orange summary-card-padding">
        <h3 className="card-heading-md">Pairing Summary</h3>
        <p className="card-subtext font-slate">Review observation/observee summary</p>

        <div className="pairing-grid">
          <div>
            <strong className="summary-field-label">Observer Name</strong>
            <p className="summary-field-val">
              {displayObserver?.name ?? "Not available"}
            </p>
          </div>
          <div>
            <strong className="summary-field-label">Observee Name</strong>
            <p className="summary-field-val">
              {displayObservee?.name ?? "Not available"}
            </p>
          </div>
          <div>
            <strong className="summary-field-label">Course and Section</strong>
            <p className="summary-field-val">
              {displayCourse
                ? `${displayCourse.department_code} ${displayCourse.course_number}.${displayCourse.section}`
                : "Not available"}
            </p>
          </div>
          <div>
            <strong className="summary-field-label">Observation Date</strong>
            <p className="summary-field-val">
              {displayDate ? new Date(displayDate).toLocaleString() : "Not available"}
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

          <span className="version-pill-tag">
            {template ? `Version ${template.version}` : "No template"}
          </span>
        </div>

        <p className="form-instruction-subtext">
          {template?.instructions}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveSurvey(true);
          }}
        >
          <div className="form-section-block-sm">
            <h4 className="section-subtitle">
              Post-Evaluation Survey Questions
            </h4>

            {template?.questions.map((question) => (
              <div className="question-field-wrapper" key={question.id}>
                <label className="question-label-bold">
                  {question.text}
                  {question.required ? " *" : ""}
                </label>

                {question.type === "rating" ? (
                  <div className="rating-btn-row">
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
                ) : (
                  <textarea
                    className="fixed-height-textarea"
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

          <div className="submit-action-row">
            {canEdit && (
              <>
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
              </>
            )}

            {!canEdit && (
              <p>This survey has already been submitted and cannot be edited.</p>
            )}
          </div>
        </form>
      </section>

      {/* Bottom Center Return Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}