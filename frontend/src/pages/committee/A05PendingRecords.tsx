// src/pages/committee/A05PendingRecords.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { ObservationRecord } from "../../api/types";
import { formatDate, formatDateTime } from "../../api/format";

function formatAcademicRank(rank: string | null | undefined): string {
  if (!rank) return "Not specified";
  const normalized = rank.trim().toLowerCase();
  const rankLabels: Record<string, string> = {
    assistant: "Assistant Professor",
    "assistant professor": "Assistant Professor",
    associate: "Associate Professor",
    "associate professor": "Associate Professor",
    full: "Full Professor",
    "full professor": "Full Professor",
    professor_of_instruction: "Professor of Instruction",
    "professor of instruction": "Professor of Instruction",
  };

  return rankLabels[normalized] || rank;
}

export default function A05PendingObservationRecords() {
  const [pending, setPending] = useState<{
    cycle_id: number;
    count: number;
    records: {
      pairing_id: number;
      observation_id: number | null;
      observation_datetime: string | null;
      observee_id: number;
      observee_name: string;
      department: string | null;
      academic_rank: string;
      observer_id: number;
      missing: string;
      action_required_by_user_id: number;
    }[];
  } | null>(null);

  const [completed, setCompleted] = useState<
    Awaited<ReturnType<typeof committeeApi.completedRecords>>["records"]
  >([]);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [missingFilter, setMissingFilter] = useState<
    "all" | "observer_submission" | "observee_signature"
  >("all");
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] =
    useState<ObservationRecord | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRecords() {
    try {
      const [pendingResult, completedResult] = await Promise.all([
        committeeApi.pendingRecords(),
        committeeApi.completedRecords(),
      ]);

      setPending(pendingResult as typeof pending);
      setCompleted(completedResult.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load records.");
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  async function handleRemindAll() {
    if (filteredPending.length === 0) return;

    setError("");
    setMessage("");
    setIsSendingAll(true);
    try {
      const results = await Promise.allSettled(
        filteredPending.map((record) =>
          committeeApi.remindRecord(record.pairing_id)
        )
      );

      const succeededCount = results.filter(
        (res) => res.status === "fulfilled"
      ).length;
      const failedCount = results.length - succeededCount;

      setShowConfirmAll(false);
      await loadRecords();

      if (failedCount === 0) {
        setMessage(
          `Reminders sent to all ${succeededCount} pending observation record${
            succeededCount === 1 ? "" : "s"
          }.`
        );
      } else if (succeededCount > 0) {
        setMessage(
          `Sent ${succeededCount} reminder${
            succeededCount === 1 ? "" : "s"
          }.`
        );
        setError(
          `Unable to send ${failedCount} reminder${
            failedCount === 1 ? "" : "s"
          }. Please try again.`
        );
      } else {
        setError("Unable to send reminders. Please try again.");
      }
    } finally {
      setIsSendingAll(false);
    }
  }

  async function openCompletedRecord(id: number) {
    setError("");
    setLoadingDetailId(id);
    try {
      const record = await committeeApi.observationDetail(id);
      setSelectedRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load record.");
    } finally {
      setLoadingDetailId(null);
    }
  }

  const pendingRecords = pending?.records ?? [];

  const departments = [
    ...new Set(
      [...pendingRecords, ...completed]
        .map((r) => r.department)
        .filter(Boolean)
    ),
  ].sort() as string[];

  const normalizedQuery = search.trim().toLowerCase();

  const filteredPending = pendingRecords.filter((record) => {
    if (departmentFilter && record.department !== departmentFilter) {
      return false;
    }
    if (missingFilter !== "all" && record.missing !== missingFilter) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${record.observee_name} ${record.department ?? ""} ${
        record.academic_rank ?? ""
      }`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const filteredCompleted = completed.filter((record) => {
    if (departmentFilter && record.department !== departmentFilter) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${record.observee_name} ${record.department ?? ""} ${
        record.academic_rank ?? ""
      }`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const isFiltered =
    Boolean(normalizedQuery) ||
    Boolean(departmentFilter) ||
    missingFilter !== "all";

  const remindAllLabel = isSendingAll
    ? "Sending Reminders..."
    : `Remind All${
        filteredPending.length > 0 ? ` (${filteredPending.length})` : ""
      }`;

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="a02-section-header-bar">
        <h2 className="a02-section-heading">
          Observation Records &amp; Pending Follow-Ups
        </h2>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div role="alert" className="yellow-banner">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="feedback-banner-success">
          {message}
        </div>
      )}

      {/* Search & Filter Controls Bar */}
      <div className="roster-controls-row a05-controls-bar">
        <div className="search-control-group">
          <label htmlFor="a05-search">Search Records:</label>
          <div className="search-input-wrapper">
            <input
              id="a05-search"
              type="text"
              placeholder="Search by faculty name, department, or rank..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="styled-text-input"
            />
          </div>
        </div>

        {departments.length > 0 && (
          <div className="sort-control-group">
            <label htmlFor="a05-dept-filter">Department:</label>
            <select
              id="a05-dept-filter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="styled-select-input"
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sort-control-group">
          <label htmlFor="a05-missing-filter">Pending Action:</label>
          <select
            id="a05-missing-filter"
            value={missingFilter}
            onChange={(event) =>
              setMissingFilter(
                event.target.value as
                  | "all"
                  | "observer_submission"
                  | "observee_signature"
              )
            }
            className="styled-select-input"
          >
            <option value="all">All pending items</option>
            <option value="observer_submission">
              Observer submission needed
            </option>
            <option value="observee_signature">
              Observee signature needed
            </option>
          </select>
        </div>
      </div>

      {/* SECTION 1: PENDING EVALUATION FORMS */}
      <section className="dashboard-phase">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">Pending Evaluation Forms</h3>
            <span
              className={`status-chip a04-nowrap-chip ${
                filteredPending.length > 0 ? "a02-chip-warning" : "chip-draft"
              }`}
            >
              {filteredPending.length} PENDING
            </span>
          </div>
        </div>

        {/* Blue Theme Scrollable Table Box with Single Remind All Action */}
        <div className="table-container theme-blue">
          <div className="table-instruction table-instruction-bar">
            <span>
              Review unfinished observation records requiring action from an
              observer or observee.
            </span>

            <button
              type="button"
              className="btn-accent-blue"
              disabled={filteredPending.length === 0 || isSendingAll}
              onClick={() => setShowConfirmAll(true)}
            >
              {remindAllLabel}
            </button>
          </div>

          <div className="table-scroll-wrapper table-scroll-box">
            <table className="custom-data-table sticky-header-table">
              <thead>
                <tr>
                  <th scope="col">Faculty Member</th>
                  <th scope="col">Department</th>
                  <th scope="col">Academic Rank</th>
                  <th scope="col">Outstanding Item</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((record) => {
                  const isObserverMissing =
                    record.missing === "observer_submission";

                  return (
                    <tr key={record.pairing_id}>
                      <td className="font-semibold">{record.observee_name}</td>

                      <td>{record.department ?? "Not provided"}</td>

                      <td>{formatAcademicRank(record.academic_rank)}</td>

                      <td>
                        <span
                          className={`status-chip a02-chip-xs a04-nowrap-chip ${
                            isObserverMissing
                              ? "a02-chip-warning"
                              : "a05-chip-info"
                          }`}
                        >
                          {isObserverMissing
                            ? "Observer needs to complete form"
                            : "Observee needs to sign"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {pending && filteredPending.length === 0 && (
                  <tr>
                    <td colSpan={4} className="a03-empty-cell">
                      {pendingRecords.length === 0
                        ? "No pending observation records."
                        : "No pending observation records match your current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: VIEW COMPLETED OBSERVATION RECORDS */}
      <section className="dashboard-phase phase-spacing">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">
              Completed Observation Records
            </h3>
            <span className="status-chip chip-draft a04-nowrap-chip">
              {filteredCompleted.length} COMPLETED
            </span>
          </div>
        </div>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select View Details to see a summary of the completed observation
            record.
          </div>

          <div className="table-scroll-wrapper table-scroll-box">
            <table className="custom-data-table sticky-header-table">
              <thead>
                <tr>
                  <th>Observee Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Completion Date</th>
                  <th className="align-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompleted.map((record) => {
                  const isLoading = loadingDetailId === record.observation_id;
                  return (
                    <tr key={record.observation_id}>
                      <td className="font-semibold">{record.observee_name}</td>
                      <td>{record.department ?? "Not provided"}</td>
                      <td>{formatAcademicRank(record.academic_rank)}</td>
                      <td>
                        {record.completed_at
                          ? formatDate(record.completed_at)
                          : "Not provided"}
                      </td>
                      <td className="align-center">
                        <button
                          type="button"
                          className="btn-pill-green"
                          disabled={isLoading}
                          onClick={() =>
                            void openCompletedRecord(record.observation_id)
                          }
                        >
                          {isLoading ? "Loading..." : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredCompleted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="a03-empty-cell">
                      {completed.length === 0
                        ? "No completed observation records."
                        : "No completed observation records match your current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Standardized Bottom Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>

      {/* Confirmation Popup for Bulk Remind All */}
      {showConfirmAll && (
        <div
          className="modal-backdrop a04-confirm-backdrop"
          onClick={() => !isSendingAll && setShowConfirmAll(false)}
        >
          <div
            className="modal-card a04-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a05-confirm-all-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="a05-confirm-all-title" className="a04-confirm-title">
              Remind All Pending Records?
            </h3>
            <p className="a04-confirm-text">
              This will send a reminder notification to the responsible faculty
              member for{" "}
              <strong>
                {filteredPending.length}{" "}
                {isFiltered ? "filtered " : ""}pending observation record
                {filteredPending.length === 1 ? "" : "s"}
              </strong>
              . Do you want to continue?
            </p>
            <div className="a04-confirm-actions">
              <button
                type="button"
                className="btn-secondary a04-action-btn"
                disabled={isSendingAll}
                onClick={() => setShowConfirmAll(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-accent-blue"
                disabled={isSendingAll}
                onClick={() => void handleRemindAll()}
              >
                {isSendingAll
                  ? "Sending Reminders..."
                  : `Remind All (${filteredPending.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Observation Record Detail Modal */}
      {selectedRecord && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="modal-card a05-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a05-record-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="a04-modal-header">
              <div>
                <h3 id="a05-record-modal-title" className="a04-modal-name">
                  Observation Record Details
                </h3>
                <p className="a04-modal-subtitle">
                  {selectedRecord.course.department_code}{" "}
                  {selectedRecord.course.course_number}.
                  {selectedRecord.course.section} ·{" "}
                  {selectedRecord.template.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="modal-close-x"
                aria-label="Close observation record details"
              >
                &times;
              </button>
            </div>

            <div className="a05-modal-body">
              <div className="a04-profile-grid">
                <div className="a04-profile-item">
                  <span className="a02-card-section-label">Observer</span>
                  <span className="a04-profile-value">
                    {selectedRecord.observer.name}
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">Observee</span>
                  <span className="a04-profile-value">
                    {selectedRecord.observee.name}
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">Course</span>
                  <span className="a04-profile-value">
                    {selectedRecord.course.department_code}{" "}
                    {selectedRecord.course.course_number}.
                    {selectedRecord.course.section}
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">
                    Observation Date
                  </span>
                  <span className="a04-profile-value">
                    {selectedRecord.confirmed_datetime
                      ? formatDateTime(selectedRecord.confirmed_datetime)
                      : "Not scheduled"}
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">
                    Observer Signature
                  </span>
                  <span className="a04-profile-value">
                    <span
                      className={`status-chip a02-chip-xs a04-nowrap-chip ${
                        selectedRecord.observer_signed
                          ? "chip-draft"
                          : "a02-chip-warning"
                      }`}
                    >
                      {selectedRecord.observer_signed ? "Complete" : "Pending"}
                    </span>
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">
                    Observee Signature
                  </span>
                  <span className="a04-profile-value">
                    <span
                      className={`status-chip a02-chip-xs a04-nowrap-chip ${
                        selectedRecord.observee_signed
                          ? "chip-draft"
                          : "a02-chip-warning"
                      }`}
                    >
                      {selectedRecord.observee_signed ? "Complete" : "Pending"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="a05-responses-section">
                <h4 className="a05-responses-heading">
                  {selectedRecord.template.name}
                </h4>

                <div className="a05-responses-list">
                  {selectedRecord.template.questions.map((question, idx) => (
                    <div key={question.id} className="a05-response-card">
                      <span className="a05-response-question">
                        {idx + 1}. {question.text}
                      </span>
                      <span className="a05-response-answer">
                        {String(
                          selectedRecord.responses[question.id] ?? "No answer"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="a04-modal-footer">
              <button
                type="button"
                className="btn-primary a04-close-btn"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}