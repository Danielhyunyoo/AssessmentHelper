import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { observationApi } from "../../api/endpoints";
import type { ObservationRecord } from "../../api/types";
import { formatDateTime } from "../../api/format";
import { ApiError } from "../../api/http";

function recordError(err: unknown, record: ObservationRecord, fallback: string) {
  if (!(err instanceof Error)) return fallback;
  const payload = err instanceof ApiError && typeof err.payload === "object" ? err.payload : null;
  const answers = payload?.responses;
  if (!answers || typeof answers !== "object") return err.message;
  const byMessage: Record<string, string[]> = {};
  for (const [id, message] of Object.entries(answers as Record<string, unknown>)) {
    const question = record.template.questions.find((item) => String(item.id) === id);
    const key = String(message).replace(/\.$/, "");
    byMessage[key] = [...(byMessage[key] ?? []), question?.text ?? id];
  }
  return Object.entries(byMessage).map(([message, questions]) => `${message}: ${questions.join("; ")}.`).join(" ");
}

export default function S05ObservationRecord() {
  const { observationId } = useParams();
  const [record, setRecord] = useState<ObservationRecord | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    async function loadRecord() {
      if (!observationId) {
        setError("No observation record was selected.");
        setLoading(false);
        return;
      }

      try {
        const result = await observationApi.detail(Number(observationId));

        setRecord(result);
        setResponses(result.responses ?? {});
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load observation record."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRecord();
  }, [observationId]);

  const handleAnswerChange = (
    questionId: string,
    answer: string | number
  ) => {
    setResponses((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  };

  const handleSave = async () => {
    if (!record || !record.can_edit) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await observationApi.saveDraft(
        record.observation_id,
        responses
      );

      setRecord(updated);
      setResponses(updated.responses ?? {});
      setSuccess("Observation record saved.");
    } catch (err) {
      setError(recordError(err, record, "Unable to save record."));
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!record || !record.can_sign) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (record.can_edit) {
        const saved = await observationApi.saveDraft(
          record.observation_id,
          responses
        );

        setRecord(saved);
      }

      const updated = await observationApi.sign(record.observation_id);

      setRecord(updated);
      setResponses(updated.responses ?? {});
      setSuccess(
        updated.locked
          ? "Both participants have signed. This record is now locked."
          : "Your signature has been saved."
      );
    } catch (err) {
      setError(recordError(err, record, "Unable to sign record."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Loading observation record...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="dashboard-container">
        <p role="alert">
          {error || "The requested observation record could not be loaded."}
        </p>
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

      <h2>Observation Record</h2>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      {/* Pairing Summary Box */}
      <section className="table-container theme-orange summary-card-padding">
        <h3 className="card-heading-md">Pairing Summary</h3>
        <p className="card-subtext font-slate">Review observation/observee summary</p>

        <div className="pairing-grid">
          <div>
            <strong className="summary-field-label">Observer Name</strong>
            <p className="summary-field-val">{record.observer.name}</p>
          </div>
          <div>
            <strong className="summary-field-label">Observee Name</strong>
            <p className="summary-field-val">{record.observee.name}</p>
          </div>
          <div>
            <strong className="summary-field-label">Course and Section</strong>
            <p className="summary-field-val">
              {record.course.department_code} {record.course.course_number}
              {" "}Section {record.course.section}
              {record.course.schedule ? `, ${record.course.schedule}` : ""}
            </p>
          </div>
          <div>
            <strong className="summary-field-label">Observation Date</strong>
            <p className="summary-field-val">
              {record.confirmed_datetime
                ? formatDateTime(record.confirmed_datetime)
                : "Not scheduled"}
            </p>
          </div>
        </div>
      </section>

      {/* Evaluation Form Main Container */}
      <section className="table-container theme-green summary-card-padding">
        <div className="form-header-row">
          <h3 className="card-heading-md margin-none">
            {record.template.name}
          </h3>

          <span className="version-pill-tag">
            Version {record.template.version}
          </span>
        </div>

        <p className="form-instruction-subtext">
          {record.template.instructions}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="form-section-block">
            <h4 className="section-subtitle">Observation Questions</h4>

            {record.template.questions.map((question) => (
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
                        disabled={!record.can_edit}
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
                    disabled={!record.can_edit}
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

          <div className="form-section-block-sm">
            <h4 className="section-subtitle">Signatures</h4>

            <div className="signature-wrapper">
              <strong>Observer</strong>
              <p>
                {record.observer_signed
                  ? `Signed ${record.observer_signed_at
                      ? formatDateTime(record.observer_signed_at)
                      : ""}`
                  : "Awaiting observer signature"}
              </p>
            </div>

            <div className="signature-wrapper">
              <strong>Observee</strong>
              <p>
                {record.observee_signed
                  ? `Signed ${record.observee_signed_at
                      ? formatDateTime(record.observee_signed_at)
                      : ""}`
                  : "Awaiting observee signature"}
              </p>
            </div>

            <p className="disclaimer-text">
              By signing this form, you acknowledge that the classroom observation
              occurred. Your signature is recorded using your authenticated account.
            </p>

            {record.locked && (
              <p role="status">
                Both participants have signed. This record is locked.
              </p>
            )}
          </div>

          <div className="submit-action-row">
            {record.can_edit && (
              <button
                type="submit"
                className="btn-secondary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            )}

            {record.can_sign && (
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void handleSign()}
              >
                {saving ? "Processing..." : "Sign Observation"}
              </button>
            )}
          </div>
        </form>

        {/* Action Buttons: Print & Download */}
        <div className="external-action-row">
          <div className="external-action-row">
            <button type="button" className="btn-primary" onClick={handlePrint}>
              Print
            </button>
          </div>
        </div>
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