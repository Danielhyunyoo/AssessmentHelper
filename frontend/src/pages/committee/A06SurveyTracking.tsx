// src/pages/committee/A06SurveyTracking.tsx
import { useEffect, useState } from "react";
import { downloadSurveyFile } from "../../api/http";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { Survey } from "../../api/types";
import { formatDate, formatDateTime } from "../../api/format";

function formatAcademicRank(rank: string | null | undefined): string {
  if (!rank) return "Not provided";
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

export default function A06SurveyTracking() {
  const [surveyData, setSurveyData] =
    useState<Awaited<ReturnType<typeof committeeApi.pendingSurveys>> | null>(
      null
    );

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "observer" | "observee">(
    "all"
  );

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  async function openSurveyDetails(surveyId: number) {
    setError("");
    setLoadingDetailId(surveyId);
    try {
      const result = await committeeApi.surveyDetail(surveyId);
      setSelectedSurvey(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load survey details."
      );
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function handleDownloadFile(surveyId: number) {
    setError("");
    try {
      await downloadSurveyFile(surveyId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download the supporting file."
      );
    }
  }

  async function loadSurveys(showSpinner = false) {
    if (showSpinner) setIsRefreshing(true);
    try {
      setError("");
      const result = await committeeApi.pendingSurveys();
      setSurveyData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load surveys.");
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadSurveys();
  }, []);

  async function handleRemindAll() {
    if (filteredMissing.length === 0) return;

    setError("");
    setMessage("");
    setIsSendingAll(true);

    try {
      const results = await Promise.allSettled(
        filteredMissing.map((record) =>
          committeeApi.remindSurvey(record.pairing_id, record.respondent_type)
        )
      );

      const succeededCount = results.filter(
        (res) => res.status === "fulfilled"
      ).length;
      const failedCount = results.length - succeededCount;

      setShowConfirmAll(false);
      await loadSurveys();

      if (failedCount === 0) {
        setMessage(
          `Reminders sent for all ${succeededCount} missing post-evaluation survey${
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

  const missingRecords = surveyData?.missing ?? [];
  const completedRecords = surveyData?.completed ?? [];

  const departments = [
    ...new Set(
      [...missingRecords, ...completedRecords]
        .map((r) => r.department)
        .filter(Boolean)
    ),
  ].sort() as string[];

  const normalizedQuery = search.trim().toLowerCase();

  const filteredMissing = missingRecords.filter((record) => {
    if (departmentFilter && record.department !== departmentFilter) {
      return false;
    }
    if (roleFilter !== "all" && record.respondent_type !== roleFilter) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${record.faculty_name} ${record.department ?? ""} ${
        record.academic_rank ?? ""
      } ${record.respondent_type}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const filteredCompleted = completedRecords.filter((record) => {
    if (departmentFilter && record.department !== departmentFilter) {
      return false;
    }
    if (roleFilter !== "all" && record.respondent_type !== roleFilter) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${record.faculty_name} ${record.department ?? ""} ${
        record.academic_rank ?? ""
      } ${record.respondent_type}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const isFiltered =
    Boolean(normalizedQuery) ||
    Boolean(departmentFilter) ||
    roleFilter !== "all";

  const remindAllLabel = isSendingAll
    ? "Sending Reminders..."
    : `Remind All${
        filteredMissing.length > 0 ? ` (${filteredMissing.length})` : ""
      }`;

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Page Header & Refresh Action */}
      <div className="a02-section-header-bar">
        <h2 className="a02-section-heading">
          Post-Evaluation Survey Tracking
        </h2>

        <button
          type="button"
          className="btn-secondary"
          disabled={isRefreshing}
          onClick={() => void loadSurveys(true)}
        >
          {isRefreshing ? "Refreshing..." : "Refresh Survey Data"}
        </button>
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
          <label htmlFor="a06-search">Search Surveys:</label>
          <div className="search-input-wrapper">
            <input
              id="a06-search"
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
            <label htmlFor="a06-dept-filter">Department:</label>
            <select
              id="a06-dept-filter"
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
          <label htmlFor="a06-role-filter">Respondent Role:</label>
          <select
            id="a06-role-filter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value as "all" | "observer" | "observee"
              )
            }
            className="styled-select-input"
          >
            <option value="all">All roles</option>
            <option value="observer">Observer</option>
            <option value="observee">Observee</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: MISSING POST-EVALUATION SURVEYS */}
      <section className="dashboard-phase missing-surveys-phase">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">
              Missing Post-Evaluation Surveys
            </h3>
            <span
              className={`status-chip a04-nowrap-chip ${
                filteredMissing.length > 0 ? "a02-chip-warning" : "chip-draft"
              }`}
            >
              {filteredMissing.length} MISSING
            </span>
          </div>
        </div>

        <div className="table-container theme-blue">
          <div className="table-instruction table-instruction-bar">
            <span>
              Review faculty who have not yet submitted their post-evaluation
              survey.
            </span>

            <button
              type="button"
              className="btn-accent-blue"
              disabled={filteredMissing.length === 0 || isSendingAll}
              onClick={() => setShowConfirmAll(true)}
            >
              {remindAllLabel}
            </button>
          </div>

          <div className="table-scroll-wrapper table-scroll-box">
            <table className="custom-data-table sticky-header-table">
              <thead>
                <tr>
                  <th scope="col">Faculty Name</th>
                  <th scope="col">Department</th>
                  <th scope="col">Academic Rank</th>
                  <th scope="col">Respondent Role</th>
                  <th scope="col">Observation Date</th>
                  <th scope="col">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {!surveyData && (
                  <tr>
                    <td colSpan={6} className="a03-empty-cell">
                      Loading survey data...
                    </td>
                  </tr>
                )}

                {filteredMissing.map((record) => {
                  const key = `${record.pairing_id}-${record.respondent_type}`;
                  const isObserver = record.respondent_type === "observer";

                  return (
                    <tr key={key}>
                      <td className="font-semibold">{record.faculty_name}</td>
                      <td>{record.department ?? "Not provided"}</td>
                      <td>{formatAcademicRank(record.academic_rank)}</td>
                      <td>
                        <span
                          className={`status-chip a02-chip-xs a04-nowrap-chip ${
                            isObserver ? "a05-chip-info" : "a02-chip-warning"
                          }`}
                        >
                          {isObserver ? "Observer" : "Observee"}
                        </span>
                      </td>
                      <td>
                        {record.observation_datetime
                          ? formatDate(record.observation_datetime)
                          : "Not provided"}
                      </td>
                      <td>{formatDate(record.survey_deadline)}</td>
                    </tr>
                  );
                })}

                {surveyData && filteredMissing.length === 0 && (
                  <tr>
                    <td colSpan={6} className="a03-empty-cell">
                      {missingRecords.length === 0
                        ? surveyData.surveys_open === false
                          ? surveyData.observation_deadline
                            ? `Surveys open after ${formatDate(
                                surveyData.observation_deadline
                              )}.`
                            : "Surveys open after the observation deadline."
                          : "No missing surveys."
                        : "No missing surveys match your current filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: VIEW COMPLETED POST-EVALUATION SURVEYS */}
      <section className="dashboard-phase phase-spacing">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">
              Completed Post-Evaluation Surveys
            </h3>
            <span className="status-chip chip-draft a04-nowrap-chip">
              {filteredCompleted.length} COMPLETED
            </span>
          </div>
        </div>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select View Details to see a summary of the completed survey.
          </div>

          <div className="table-scroll-wrapper table-scroll-box">
            <table className="custom-data-table sticky-header-table">
              <thead>
                <tr>
                  <th scope="col">Faculty Name</th>
                  <th scope="col">Department</th>
                  <th scope="col">Academic Rank</th>
                  <th scope="col">Respondent Role</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" className="align-center">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {!surveyData && (
                  <tr>
                    <td colSpan={6} className="a03-empty-cell">
                      Loading survey data...
                    </td>
                  </tr>
                )}

                {filteredCompleted.map((record) => {
                  const isLoading = loadingDetailId === record.survey_id;
                  const isObserver = record.respondent_type === "observer";

                  return (
                    <tr key={record.survey_id}>
                      <td className="font-semibold">{record.faculty_name}</td>
                      <td>{record.department ?? "Not provided"}</td>
                      <td>{formatAcademicRank(record.academic_rank)}</td>
                      <td>
                        <span
                          className={`status-chip a02-chip-xs a04-nowrap-chip ${
                            isObserver ? "a05-chip-info" : "a02-chip-warning"
                          }`}
                        >
                          {isObserver ? "Observer" : "Observee"}
                        </span>
                      </td>
                      <td>{formatDateTime(record.submitted_at)}</td>
                      <td className="align-center">
                        <button
                          type="button"
                          className="btn-pill-green"
                          disabled={isLoading}
                          onClick={() =>
                            void openSurveyDetails(record.survey_id)
                          }
                        >
                          {isLoading ? "Loading..." : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {surveyData && filteredCompleted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="a03-empty-cell">
                      {completedRecords.length === 0
                        ? "No completed surveys."
                        : "No completed surveys match your current filters."}
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
            aria-labelledby="a06-confirm-all-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="a06-confirm-all-title" className="a04-confirm-title">
              Remind All Missing Surveys?
            </h3>
            <p className="a04-confirm-text">
              This will send a reminder notification to{" "}
              <strong>
                {filteredMissing.length} {isFiltered ? "filtered " : ""}faculty
                member{filteredMissing.length === 1 ? "" : "s"}
              </strong>{" "}
              who have not yet submitted their post-evaluation survey. Do you
              want to continue?
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
                  : `Remind All (${filteredMissing.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Survey Detail Modal */}
      {selectedSurvey && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedSurvey(null)}
        >
          <div
            className="modal-card a05-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a06-survey-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="a04-modal-header">
              <div>
                <h3 id="a06-survey-modal-title" className="a04-modal-name">
                  Completed Survey Details
                </h3>
                <p className="a04-modal-subtitle">
                  {selectedSurvey.template?.name ?? "Post-Evaluation Survey"} ·{" "}
                  {selectedSurvey.respondent_type === "observer"
                    ? "Observer"
                    : "Observee"}{" "}
                  Response
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSurvey(null)}
                className="modal-close-x"
                aria-label="Close completed survey details"
              >
                &times;
              </button>
            </div>

            <div className="a05-modal-body">
              <div className="a04-profile-grid">
                <div className="a04-profile-item">
                  <span className="a02-card-section-label">
                    Respondent Role
                  </span>
                  <span className="a04-profile-value">
                    <span
                      className={`status-chip a02-chip-xs a04-nowrap-chip ${
                        selectedSurvey.respondent_type === "observer"
                          ? "a05-chip-info"
                          : "a02-chip-warning"
                      }`}
                    >
                      {selectedSurvey.respondent_type === "observer"
                        ? "Observer"
                        : "Observee"}
                    </span>
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">Submitted At</span>
                  <span className="a04-profile-value">
                    {selectedSurvey.submitted_at
                      ? formatDateTime(selectedSurvey.submitted_at)
                      : "Not submitted"}
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">Observer</span>
                  <span className="a04-profile-value">
                    {selectedSurvey.observer.name}
                  </span>
                </div>

                <div className="a04-profile-item">
                  <span className="a02-card-section-label">Observee</span>
                  <span className="a04-profile-value">
                    {selectedSurvey.observee.name}
                  </span>
                </div>
              </div>

              <div className="a05-responses-section">
                <h4 className="a05-responses-heading">
                  {selectedSurvey.template?.name ?? "Survey Responses"}
                </h4>

                <div className="a05-responses-list">
                  {selectedSurvey.template?.questions.map((question, idx) => (
                    <div key={question.id} className="a05-response-card">
                      <span className="a05-response-question">
                        {idx + 1}. {question.text}
                      </span>
                      <span className="a05-response-answer">
                        {String(
                          selectedSurvey.responses[question.id] ?? "No answer"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedSurvey.survey_file && (
                <div className="a05-responses-section">
                  <h4 className="a05-responses-heading">Supporting File</h4>
                  <div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        void handleDownloadFile(selectedSurvey.survey_id)
                      }
                    >
                      Download Attachment
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="a04-modal-footer">
              <button
                type="button"
                className="btn-primary a04-close-btn"
                onClick={() => setSelectedSurvey(null)}
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