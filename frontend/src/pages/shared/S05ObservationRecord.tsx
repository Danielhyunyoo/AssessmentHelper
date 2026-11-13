// src/pages/shared/S05ObservationRecord.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  authApi,
  facultyApi,
  matchingApi,
  observationApi,
} from "../../api/endpoints";
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

function buildDemoObservationRecord(
  id: number,
  observerName: string,
  observeeName: string,
  course?: {
    course_id?: number;
    department_id?: number;
    department_name?: string;
    department_code?: string;
    instructor_id?: number;
    course_number?: string;
    course_level?: number;
    section?: string;
    schedule?: string;
    title?: string;
    classroom?: string;
  } | null,
  confirmedDatetime?: string | null
): ObservationRecord {
  return {
    observation_id: id || 1,
    pairing_id: id || 1,
    cycle_id: 1,
    observer: { id: 1, name: observerName },
    observee: { id: 3, name: observeeName },
    course: {
      course_id: course?.course_id ?? 1,
      department_id: course?.department_id ?? 1,
      department_name: course?.department_name ?? "Computer Science",
      department_code: course?.department_code ?? "CS",
      instructor_id: course?.instructor_id ?? 3,
      course_number: course?.course_number ?? "3345",
      course_level: course?.course_level ?? 3000,
      section: course?.section ?? "001",
      schedule: course?.schedule ?? "MWF 10:00 AM - 10:50 AM",
      title: course?.title ?? "Data Structures and Algorithmic Analysis",
      classroom: course?.classroom ?? "ECSS 2.415",
    },
    confirmed_datetime: confirmedDatetime ?? new Date().toISOString(),
    template: {
      id: 1,
      name: "Peer Classroom Observation Form",
      version: 1,
      instructions:
        "Rate each classroom observation criterion from 1 (Needs Improvement) to 5 (Exemplary) and provide constructive narrative feedback.",
      questions: [
        {
          id: "q1_clarity",
          text: "Instructor clearly communicated the learning objectives and structure of the class session.",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
        },
        {
          id: "q2_engagement",
          text: "Students were actively engaged through questions, examples, or problem-solving activities.",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
        },
        {
          id: "q3_mastery",
          text: "Instructor demonstrated strong command of subject matter and responded effectively to student questions.",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
        },
        {
          id: "q4_strengths",
          text: "Observed Teaching Strengths & Effective Practices",
          type: "text",
          required: true,
        },
        {
          id: "q5_suggestions",
          text: "Constructive Suggestions for Continued Growth",
          type: "text",
          required: false,
        },
      ],
    },
    responses: {},
    status: "draft",
    cancellation_reason: "",
    observer_signed: false,
    observer_signed_at: null,
    observee_signed: false,
    observee_signed_at: null,
    locked: false,
    can_edit: true,
    can_sign: true,
    can_cancel: false,
  };
}

export default function S05ObservationRecord() {
  const { observationId } = useParams();
  const [record, setRecord] = useState<ObservationRecord | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemoPreview, setIsDemoPreview] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    async function loadRecord() {
      const numericId = Number(observationId) || 1;

      try {
        const result = await observationApi.detail(numericId);
        setRecord(result);
        setResponses(result.responses ?? {});
        setIsDemoPreview(false);
      } catch {
        const [session, profile, incoming, sent] = await Promise.all([
          authApi.session().catch(() => ({ professor: null })),
          facultyApi.profile().catch(() => null),
          matchingApi.incomingInvitations().catch(() => []),
          matchingApi.sentInvitations().catch(() => []),
        ]);

        const currentUser = session?.professor;
        const currentName = currentUser
          ? `${currentUser.first_name} ${currentUser.last_name}`.trim() ||
            currentUser.username
          : "Professor A";

        const activeIncoming = (Array.isArray(incoming) ? incoming : []).find(
          (i) => i.status === "confirmed" || i.status === "accepted"
        );
        const activeSent = (Array.isArray(sent) ? sent : []).find(
          (i) => i.status === "confirmed" || i.status === "accepted"
        );

        let observerName = "Professor A";
        let observeeName = "Professor C";
        let courseData = profile?.selected_course ?? null;
        let visitDate: string | null = null;

        if (activeIncoming) {
          observerName = currentName;
          observeeName = activeIncoming.sender
            ? `${activeIncoming.sender.first_name} ${activeIncoming.sender.last_name}`.trim()
            : "Professor C";
          courseData = activeIncoming.course ?? courseData;
          visitDate =
            activeIncoming.proposed_dates?.find((d) => d.status === "accepted")
              ?.datetime ?? null;
        } else if (activeSent) {
          observerName = `Observer #${activeSent.recipient_id}`;
          observeeName = currentName;
          visitDate =
            activeSent.proposed_dates?.find((d) => d.status === "accepted")
              ?.datetime ?? null;
        }

        const demoRecord = buildDemoObservationRecord(
          numericId,
          observerName,
          observeeName,
          courseData,
          visitDate
        );
        setRecord(demoRecord);
        setResponses({});
        setIsDemoPreview(true);
      } finally {
        setLoading(false);
      }
    }

    void loadRecord();
  }, [observationId]);

  const handleSave = async () => {
    if (!record || !record.can_edit) return;

    if (isDemoPreview) {
      setSuccess("Demo preview draft saved locally.");
      return;
    }

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

    if (isDemoPreview) {
      const nowIso = new Date().toISOString();
      if (!record.observer_signed) {
        setRecord({
          ...record,
          observer_signed: true,
          observer_signed_at: nowIso,
          can_edit: false,
          status: "awaiting_observee_signature",
        });
        setSuccess(
          "Demo preview: Observer signature recorded. Click Sign Observation again to simulate Observee sign-off."
        );
      } else {
        setRecord({
          ...record,
          observee_signed: true,
          observee_signed_at: nowIso,
          can_edit: false,
          can_sign: false,
          locked: true,
          status: "completed",
        });
        setSuccess(
          "Demo preview: Both participants have signed. This record is now locked."
        );
      }
      return;
    }

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
        updated.locked ? "" : "Your signature has been saved."
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
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="notif-page-header-row" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Observation Record</h2>
        <span
          className={`status-chip ${
            record.locked ? "chip-locked" : "chip-draft"
          }`}
          style={{ textTransform: "capitalize" }}
        >
          {record.status.replaceAll("_", " ")}
        </span>
      </div>

      {isDemoPreview && (
        <div className="yellow-banner" role="status">
          <strong>Demo Preview Mode:</strong> Interactive preview of the
          Observation Record while the backend record is pending creation.
        </div>
      )}

      {error && (
        <div className="empty-state-banner" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="feedback-banner-success" role="status">
          {success}
        </div>
      )}
      {!record.can_edit && !record.locked && record.status !== "cancelled" && (
        <div className="yellow-banner" role="status">
          {!record.observer_signed
            ? `Only ${record.observer.name} can edit this record. You can sign after they sign.`
            : record.can_sign
            ? `${record.observer.name} signed. Review and sign.`
            : `Waiting for ${record.observee.name} to sign.`}
        </div>
      )}

      {/* Pairing Summary Card */}
      <section className="table-container theme-orange summary-card-padding">
        <div className="form-header-row" style={{ marginBottom: "0.25rem" }}>
          <h3 className="card-heading-md margin-none">Pairing Summary</h3>
          {record.course.classroom && (
            <span className="version-pill">{record.course.classroom}</span>
          )}
        </div>
        <p className="card-subtext font-slate" style={{ margin: 0 }}>
          Confirmed classroom observation participants and course schedule
        </p>

        <div className="form-summary-grid-4">
          <div className="form-summary-cell">
            <span className="summary-field-label">Observer</span>
            <p className="summary-field-val">{record.observer.name}</p>
          </div>
          <div className="form-summary-cell">
            <span className="summary-field-label">Observee</span>
            <p className="summary-field-val">{record.observee.name}</p>
          </div>
          <div className="form-summary-cell">
            <span className="summary-field-label">Course &amp; Section</span>
            <p className="summary-field-val">
              {record.course.department_code} {record.course.course_number}.
              {record.course.section}
              {record.course.schedule ? ` (${record.course.schedule})` : ""}
            </p>
          </div>
          <div className="form-summary-cell">
            <span className="summary-field-label">Observation Date</span>
            <p className="summary-field-val">
              {record.confirmed_datetime
                ? new Date(record.confirmed_datetime).toLocaleString("en-US", {
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
      </section>

      {/* Evaluation Form Main Container */}
      <section className="table-container theme-green summary-card-padding">
        <div className="form-header-row">
          <h3 className="card-heading-md margin-none">
            {record.template.name}
          </h3>
          <span className="version-pill">Version {record.template.version}</span>
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
          <div className="eval-question-list">
            {record.template.questions.map((question, idx) => (
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
                    <span className="eval-scale-hint">
                      {question.max ?? 5} (High)
                    </span>
                  </div>
                ) : (
                  <textarea
                    className="fixed-height-textarea"
                    placeholder="Enter your detailed observation notes here..."
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

          {/* Signatures Section */}
          <div
            className="form-section-block-sm"
            style={{ marginTop: "2rem" }}
          >
            <h4 className="section-subtitle">Participant Sign-Off</h4>

            <div className="eval-signatures-grid">
              <div
                className={`eval-signature-card ${
                  record.observer_signed ? "is-signed" : ""
                }`}
              >
                <div className="eval-signature-header">
                  <strong>Observer ({record.observer.name})</strong>
                  <span
                    className={`status-chip ${
                      record.observer_signed ? "chip-draft" : "chip-locked"
                    }`}
                  >
                    {record.observer_signed ? "Signed" : "Pending"}
                  </span>
                </div>
                <p
                  className="observation-card-subtext"
                  style={{ margin: 0 }}
                >
                  {record.observer_signed
                    ? `Signed on ${
                        record.observer_signed_at
                          ? formatDateTime(record.observer_signed_at)
                          : "record"
                      }`
                    : "Awaiting observer review and digital signature"}
                </p>
              </div>

              <div
                className={`eval-signature-card ${
                  record.observee_signed ? "is-signed" : ""
                }`}
              >
                <div className="eval-signature-header">
                  <strong>Observee ({record.observee.name})</strong>
                  <span
                    className={`status-chip ${
                      record.observee_signed ? "chip-draft" : "chip-locked"
                    }`}
                  >
                    {record.observee_signed ? "Signed" : "Pending"}
                  </span>
                </div>
                <p
                  className="observation-card-subtext"
                  style={{ margin: 0 }}
                >
                  {record.observee_signed
                    ? `Signed on ${
                        record.observee_signed_at
                          ? formatDateTime(record.observee_signed_at)
                          : "record"
                      }`
                    : "Unlocks once observer signs the record"}
                </p>
              </div>
            </div>

            <p
              className="disclaimer-text"
              style={{ marginTop: "0.85rem", marginBottom: 0 }}
            >
              By signing this form, you acknowledge that the classroom
              observation occurred. Your signature is recorded using your
              authenticated account.
            </p>
          </div>

          {/* Footer Toolbar */}
          <div className="form-footer-toolbar">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrint}
            >
              Print / Save PDF
            </button>

            <div className="form-footer-actions">
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