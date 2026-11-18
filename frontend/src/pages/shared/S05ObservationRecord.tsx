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
  const payload =
    err instanceof ApiError && typeof err.payload === "object"
      ? err.payload
      : null;
  const answers = payload?.responses;
  if (!answers || typeof answers !== "object") return err.message;
  const byMessage: Record<string, string[]> = {};
  for (const [id, message] of Object.entries(
    answers as Record<string, unknown>
  )) {
    const question = record.template.questions.find(
      (item) => String(item.id) === id
    );
    const key = String(message).replace(/\.$/, "");
    byMessage[key] = [...(byMessage[key] ?? []), question?.text ?? id];
  }
  return Object.entries(byMessage)
    .map(([message, questions]) => `${message}: ${questions.join("; ")}.`)
    .join(" ");
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
          text: "Observed Teaching Strengths and Effective Practices",
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
  const [responses, setResponses] = useState<Record<string, string | number>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDemoPreview, setIsDemoPreview] = useState(false);
  const [isCommittee, setIsCommittee] = useState(false);
  const [isCycleRegistered, setIsCycleRegistered] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    async function loadRecord() {
      const numericId = Number(observationId) || 1;

      const sessionData = await authApi
        .session()
        .catch(() => ({ professor: null }));
      const sessionProf = sessionData?.professor ?? null;
      const adminUser = sessionProf?.role === "admin";
      setIsCommittee(adminUser);

      if (adminUser) {
        setIsCycleRegistered(true);
      } else if (sessionProf) {
        const reg = await facultyApi
          .registrationStatus()
          .catch(() => ({ is_registered: false }));
        setIsCycleRegistered(Boolean(reg.is_registered));
      }

      try {
        const result = await observationApi.detail(numericId);
        setRecord(result);
        setResponses(result.responses ?? {});
        setIsDemoPreview(false);
      } catch {
        const [profile, incoming, sent] = await Promise.all([
          facultyApi.profile().catch(() => null),
          matchingApi.incomingInvitations().catch(() => []),
          matchingApi.sentInvitations().catch(() => []),
        ]);

        const currentName = sessionProf
          ? `${sessionProf.first_name} ${sessionProf.last_name}`.trim() ||
            sessionProf.username
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
      setSuccess(updated.locked ? "" : "Your signature has been saved.");
    } catch (err) {
      setError(recordError(err, record, "Unable to sign record."));
    } finally {
      setSaving(false);
    }
  };

  const backDestination = isCommittee
    ? "/committee/dashboard"
    : isCycleRegistered
    ? "/shared/faculty-dashboard"
    : "/shared/current-past-observations";
  const backTopLabel = isCycleRegistered
    ? "← Back to Dashboard"
    : "← Back to Observations";
  const backBottomLabel = isCycleRegistered
    ? "Return to Dashboard"
    : "Return to Observations";

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">Loading observation record...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="dashboard-container">
        <p role="alert" className="empty-state-banner">
          {error || "The requested observation record could not be loaded."}
        </p>
        <Link to="/shared/current-past-observations" className="btn-secondary">
          Return to Observations
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

      {/* Header matching A03-A08 */}
      <div className="committee-page-header">
        <h2>Observation Record</h2>

        <div className="committee-page-header-meta">
          <span
            className={`status-chip a03-capitalize ${
              record.locked ? "chip-locked" : "chip-draft"
            }`}
          >
            {record.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      {isDemoPreview && (
        <div className="s05-readonly-banner s04-zero-margin" role="status">
          <strong>Demo Preview Mode:</strong> Interactive preview of the
          Observation Record while the backend record is pending creation.
        </div>
      )}

      {error && (
        <div className="empty-state-banner s04-zero-margin" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="feedback-banner-success s04-zero-margin" role="status">
          {success}
        </div>
      )}
      {record.locked && (
        <div className="s05-completed-banner" role="status">
          This observation record has been signed by both participants and is
          now locked.
        </div>
      )}
      {!record.can_edit && !record.locked && record.status !== "cancelled" && (
        <div className="s05-readonly-banner s04-zero-margin" role="status">
          {!record.observer_signed
            ? `Only ${record.observer.name} can edit this record. You can sign after they sign.`
            : record.can_sign
            ? `${record.observer.name} signed. Review and sign.`
            : `Waiting for ${record.observee.name} to sign.`}
        </div>
      )}

      {/* Pairing Summary Card */}
      <section className="s03-section-card s05-section-accent-primary">
        <div className="eval-pairing-summary-layout">
          {/* Left Column: Title & Subtitle */}
          <div className="eval-pairing-summary-left">
            <div>
              <div className="eval-pairing-title-row">
                <h3>Pairing Summary</h3>
                {record?.course?.classroom && (
                  <span className="version-pill">{record.course.classroom}</span>
                )}
              </div>
              <p className="s01-subtitle">
                Review observation/observee summary
              </p>
            </div>
          </div>

          {/* Right Column: Stacked Info Details */}
          <div className="eval-pairing-summary-right">
            <div className="eval-summary-row">
              <span className="summary-field-label">Observer Name</span>
              <p className="summary-field-val">{record.observer.name}</p>
            </div>
            <div className="eval-summary-row">
              <span className="summary-field-label">Observee Name</span>
              <p className="summary-field-val">{record.observee.name}</p>
            </div>
            <div className="eval-summary-row">
              <span className="summary-field-label">Course and Section</span>
              <p className="summary-field-val">
                {record.course.department_code} {record.course.course_number} Sec {record.course.section}
                {record.course.schedule ? ` (${record.course.schedule})` : ""}
              </p>
            </div>
            <div className="eval-summary-row">
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
        </div>
      </section>

      {/* Evaluation Form Main Container */}
      <section className="s03-section-card s05-section-accent-sage">
        <div className="s01-card-top-bar">
          <div>
            <h3>{record.template.name}</h3>
            <p className="s01-subtitle">{record.template.instructions}</p>
          </div>
          <span className="version-pill">Version {record.template.version}</span>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="eval-question-list">
            {record.template.questions.map((question, idx) => (
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
                          disabled={!record.can_edit}
                          onClick={() =>
                            setResponses((previous) => ({
                              ...previous,
                              [question.id]: score,
                            }))
                          }
                          className={`rating-scale-option ${
                            responses[question.id] === score ? "is-selected" : ""
                          } ${!record.can_edit ? "is-disabled" : ""}`}
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
          <div className="eval-signoff-box">
            <div className="s01-card-top-bar">
              <h4>Participant Sign-Off</h4>
            </div>

            <div className="s05-signature-grid">
              <div
                className={`s05-signature-card ${
                  record.observer_signed ? "is-signed" : ""
                }`}
              >
                <span className="s05-signature-role">
                  Observer - {record.observer.name}
                </span>
                <span className="s05-signature-status">
                  {record.observer_signed ? "Signed" : "Pending Signature"}
                </span>
                <span className="s05-signature-date">
                  {record.observer_signed
                    ? `Signed on ${
                        record.observer_signed_at
                          ? formatDateTime(record.observer_signed_at)
                          : "record"
                      }`
                    : "Awaiting observer review and digital signature"}
                </span>
              </div>

              <div
                className={`s05-signature-card ${
                  record.observee_signed ? "is-signed" : ""
                }`}
              >
                <span className="s05-signature-role">
                  Observee - {record.observee.name}
                </span>
                <span className="s05-signature-status">
                  {record.observee_signed ? "Signed" : "Pending Signature"}
                </span>
                <span className="s05-signature-date">
                  {record.observee_signed
                    ? `Signed on ${
                        record.observee_signed_at
                          ? formatDateTime(record.observee_signed_at)
                          : "record"
                      }`
                    : "Unlocks once observer signs the record"}
                </span>
              </div>
            </div>

            <p className="s05-signoff-note">
              By signing this form, you acknowledge that the classroom
              observation occurred. Your signature is recorded using your
              authenticated account.
            </p>
          </div>

          {/* Footer Toolbar */}
          <div className="eval-form-actions is-split">
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
        <Link to={backDestination} className="btn-secondary">
          {backBottomLabel}
        </Link>
      </div>
    </div>
  );
}