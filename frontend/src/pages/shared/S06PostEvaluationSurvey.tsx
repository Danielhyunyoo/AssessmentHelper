// src/pages/shared/S06PostEvaluationSurvey.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  authApi,
  facultyApi,
  observationApi,
  surveyApi,
} from "../../api/endpoints";
import type {
  ObservationRecord,
  RegistrationStatus,
  Survey,
  Template,
} from "../../api/types";
import { isUserTransferredToNextCycle } from "../committee/A02FacultyMatching";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const L03_ROUTE = "/login/signin2";

function getInitials(name?: string | null) {
  if (!name) return "?";
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[a-zA-Z]/.test(word));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function S06PostEvaluationSurvey() {
  const { surveyId } = useParams();
  const [searchParams] = useSearchParams();
  const reportRef = useRef<HTMLDivElement>(null);

  const pairingId = Number(searchParams.get("pairingId"));

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [record, setRecord] = useState<ObservationRecord | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [respondentType, setRespondentType] = useState<
    "observer" | "observee" | null
  >(null);
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [isCommittee, setIsCommittee] = useState(false);
  const [isCycleRegistered, setIsCycleRegistered] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = reportRef.current;
    if (!element) return;

    setExportingPdf(true);
    element.classList.add("pdf-capturing");

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 960,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "letter");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        margin,
        contentWidth,
        Math.min(contentHeight, pdfHeight - margin * 2)
      );
      pdf.save(`Post-Evaluation-Survey-${survey?.survey_id ?? pairingId}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError("Unable to download PDF. You can use Print Survey instead.");
    } finally {
      element.classList.remove("pdf-capturing");
      setExportingPdf(false);
    }
  };

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
    let cancelled = false;

    async function refreshAccessStatus() {
      const sessionData = await authApi
        .session()
        .catch(() => ({ professor: null }));
      if (cancelled) return;

      const sessionProf = sessionData?.professor ?? null;
      const adminUser = sessionProf?.role === "admin";
      setIsCommittee(adminUser);

      if (adminUser) {
        setIsCycleRegistered(true);
      } else if (sessionProf) {
        const reg = await facultyApi
          .registrationStatus()
          .catch(() => null);
        if (cancelled) return;
        const transferred = isUserTransferredToNextCycle(
          sessionProf,
          reg as RegistrationStatus | null
        );
        setIsCycleRegistered(Boolean(reg?.is_registered) && !transferred);
      } else {
        setIsCycleRegistered(false);
      }
    }

    async function loadSurvey() {
      setLoading(true);
      setError("");

      try {
        await refreshAccessStatus();
        if (cancelled) return;

        if (surveyId) {
          const result = await surveyApi.detail(Number(surveyId));
          if (cancelled) return;
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
        if (cancelled) return;

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
        if (cancelled) return;
        setRespondentType(result.respondent_type);
        setTemplate(result.template);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Survey not available.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSurvey();

    const handleAccessSync = () => {
      void refreshAccessStatus();
    };

    window.addEventListener("cycle-transfers-updated", handleAccessSync);
    window.addEventListener("demo-reset", handleAccessSync);
    return () => {
      cancelled = true;
      window.removeEventListener("cycle-transfers-updated", handleAccessSync);
      window.removeEventListener("demo-reset", handleAccessSync);
    };
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

  const courseLabel = displayCourse
    ? [
        [displayCourse.department_code, displayCourse.course_number]
          .filter(Boolean)
          .join(" "),
        displayCourse.section ? `Sec ${displayCourse.section}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "Not available";

  const backDestination = isCommittee
    ? "/committee/dashboard"
    : isCycleRegistered
    ? "/shared/faculty-dashboard"
    : L03_ROUTE;
  const backTopLabel = isCycleRegistered
    ? "← Back to Dashboard"
    : "← Back to Cycle Registration";
  const backBottomLabel = isCycleRegistered
    ? "Return to Dashboard"
    : "Return to Cycle Registration";

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
        <Link to={backDestination} className="btn-secondary">
          {backBottomLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="back-dashboard-wrapper">
        <Link to={backDestination} className="back-dashboard-link">
          {backTopLabel}
        </Link>
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

      <div ref={reportRef} className="a07-report-stack">
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

        <section className="s03-section-card s05-section-accent-primary">
          <div className="eval-pairing-summary-layout">
            <div className="eval-pairing-summary-left">
              <div className="eval-pairing-header-block">
                <div className="eval-pairing-title-row">
                  <h3>Pairing Summary</h3>
                  {displayCourse?.classroom && (
                    <span className="version-pill">{displayCourse.classroom}</span>
                  )}
                </div>
                <p className="s01-subtitle">
                  Observation participants, course section, and scheduled time.
                </p>
              </div>

              <div className="eval-summary-stack">
                <div className="eval-summary-person-row">
                  <div className="eval-person-avatar avatar-observer" aria-hidden="true">
                    {getInitials(displayObserver?.name)}
                  </div>
                  <div className="eval-person-info">
                    <span className="summary-field-label">Observer</span>
                    <p className="summary-field-val">
                      {displayObserver?.name || "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="eval-summary-person-row">
                  <div className="eval-person-avatar avatar-observee" aria-hidden="true">
                    {getInitials(displayObservee?.name)}
                  </div>
                  <div className="eval-person-info">
                    <span className="summary-field-label">Observee</span>
                    <p className="summary-field-val">
                      {displayObservee?.name || "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="eval-summary-row">
                  <span className="summary-field-label">Course and Section</span>
                  <p className="summary-field-val">
                    {courseLabel}
                    {displayCourse?.schedule ? ` (${displayCourse.schedule})` : ""}
                  </p>
                </div>

                <div className="eval-summary-row">
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
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
            </div>

            <div className="eval-pairing-summary-right no-print">
              <div className="eval-instructions-header">
                <h4 className="eval-instructions-title">How It Works</h4>
                <p className="eval-instructions-sub">
                  Follow these steps to complete and submit your post-observation feedback.
                </p>
              </div>

              <ol className="eval-instructions-list">
                <li>
                  <span className="eval-step-badge">1</span>
                  <span>
                    Answer the post-observation survey questions below based on your experience in this pairing.
                  </span>
                </li>
                <li>
                  <span className="eval-step-badge">2</span>
                  <span>
                    Use Save Draft anytime if you want to finish your responses later before submitting.
                  </span>
                </li>
                <li>
                  <span className="eval-step-badge">3</span>
                  <span>
                    Click Submit Survey when ready. Submitted responses are final and become read-only.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </section>

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
              {template?.questions.map((question, idx) => {
                const rawValue = responses[question.id];
                const hasValue =
                  rawValue !== undefined &&
                  rawValue !== null &&
                  String(rawValue).trim() !== "";

                return (
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
                      <>
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
                                  responses[question.id] === score
                                    ? "is-selected"
                                    : ""
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

                        <div
                          className={`print-only-answer ${
                            !hasValue ? "is-unanswered" : ""
                          }`}
                        >
                          {hasValue
                            ? `Rating: ${rawValue} / ${question.max ?? 5}`
                            : "Not rated"}
                        </div>
                      </>
                    ) : (
                      <>
                        <textarea
                          className="eval-textarea"
                          placeholder="Share your feedback here..."
                          value={String(rawValue ?? "")}
                          disabled={!canEdit}
                          required={question.required}
                          onChange={(event) =>
                            setResponses((previous) => ({
                              ...previous,
                              [question.id]: event.target.value,
                            }))
                          }
                        />

                        <div
                          className={`print-only-answer ${
                            !hasValue ? "is-unanswered" : ""
                          }`}
                        >
                          {hasValue ? String(rawValue) : "No response provided."}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {respondentType === "observee" && (
              <div className="eval-signoff-box no-print">
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
      </div>

      <div className="kpi-export-actions-bottom">
        <button
          type="button"
          className="btn-primary"
          disabled={exportingPdf}
          onClick={() => void handleDownloadPdf()}
        >
          {exportingPdf ? "Generating PDF..." : "Download PDF"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handlePrint}
        >
          Print Survey
        </button>
      </div>

      <div className="dashboard-center-action">
        <Link to={backDestination} className="btn-secondary">
          {backBottomLabel}
        </Link>
      </div>
    </div>
  );
}