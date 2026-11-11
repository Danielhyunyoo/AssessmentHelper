import { useEffect, useState } from "react";
import { downloadSurveyFile } from "../../api/http";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { Survey } from "../../api/types";

export default function A06SurveyTracking() {
  const [surveyData, setSurveyData] =
    useState<Awaited<ReturnType<typeof committeeApi.pendingSurveys>> | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  async function openSurveyDetails(surveyId: number) {
    try {
      const result = await committeeApi.surveyDetail(surveyId);
      setSelectedSurvey(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load survey details."
      );
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

  async function loadSurveys() {
    try {
      setError("");
      const result = await committeeApi.pendingSurveys();
      setSurveyData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load surveys.");
    }
  }

  useEffect(() => {
    void loadSurveys();
  }, []);

  async function handleReminder(
    pairingId: number,
    role: "observer" | "observee"
  ) {
    const key = `${pairingId}-${role}`;

    setError("");
    setMessage("");
    setSendingReminder(key);

    try {
      await committeeApi.remindSurvey(pairingId, role);
      setMessage(`Reminder sent to the ${role}.`);
      await loadSurveys();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send reminder."
      );
    } finally {
      setSendingReminder(null);
    }
  }

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Post-Evaluation Survey Tracking</h2>
      <div className="dashboard-center-action">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void loadSurveys()}
        >
          Refresh Survey Data
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {!surveyData && <p>Loading survey data...</p>}

      {/* SECTION 1: MISSING POST-EVALUATION SURVEYS */}
      <section className="dashboard-phase missing-surveys-phase">
        <h3>Missing Post-Evaluation Surveys</h3>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select a Professor's name to dispatch a survey deadline notification.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Academic Rank</th>
                  <th>Respondent Role</th>
                  <th>Observation Date</th>
                  <th>Deadline</th>
                  <th className="align-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {surveyData?.missing.map((record) => (
                  <tr key={`${record.pairing_id}-${record.respondent_type}`}>
                    <td>{record.faculty_name}</td>
                    <td>{record.department ?? "Not provided"}</td>
                    <td>{record.academic_rank || "Not provided"}</td>
                    <td>{record.respondent_type}</td>
                    <td>
                      {record.observation_datetime
                        ? new Date(record.observation_datetime).toLocaleDateString()
                        : "Not provided"}
                    </td>
                    <td>{new Date(record.survey_deadline).toLocaleDateString()}</td>
                    <td className="align-center">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={sendingReminder === `${record.pairing_id}-${record.respondent_type}`}
                        onClick={() =>
                          void handleReminder(record.pairing_id, record.respondent_type)
                        }
                      >
                        {sendingReminder === `${record.pairing_id}-${record.respondent_type}`
                          ? "Sending..."
                          : "Send Reminder"}
                      </button>
                    </td>
                  </tr>
                ))}

                {surveyData && surveyData.missing.length === 0 && (
                  <tr>
                    <td colSpan={7}>No missing surveys.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: VIEW COMPLETED POST-EVALUATION SURVEYS */}
      <section className="dashboard-phase phase-spacing">
        <h3>View Completed Post-Evaluation Surveys</h3>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select View Details to see a summary of the completed survey.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Academic Rank</th>
                  <th>Respondent Role</th>
                  <th>Submitted</th>
                  <th className="align-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {surveyData?.completed.map((record) => (
                  <tr key={record.survey_id}>
                    <td>{record.faculty_name}</td>
                    <td>{record.department ?? "Not provided"}</td>
                    <td>{record.academic_rank || "Not provided"}</td>
                    <td>{record.respondent_type}</td>
                    <td>{new Date(record.submitted_at).toLocaleString()}</td>
                    <td className="align-center">
                      <button
                        type="button"
                        className="table-name-link"
                        onClick={() => void openSurveyDetails(record.survey_id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}

                {surveyData && surveyData.completed.length === 0 && (
                  <tr>
                    <td colSpan={6}>No completed surveys.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
      {selectedSurvey && (
        <div className="modal-overlay" onClick={() => setSelectedSurvey(null)}>
          <div
            className="modal-content-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header-bar">
              <h3>Completed Survey Details</h3>

              <button
                type="button"
                onClick={() => setSelectedSurvey(null)}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <div className="modal-details-list">
              <p>
                <strong>Respondent:</strong> {selectedSurvey.respondent_type}
              </p>
              <p>
                <strong>Observer:</strong> {selectedSurvey.observer.name}
              </p>
              <p>
                <strong>Observee:</strong> {selectedSurvey.observee.name}
              </p>
              <p>
                <strong>Submitted:</strong>{" "}
                {selectedSurvey.submitted_at
                  ? new Date(selectedSurvey.submitted_at).toLocaleString()
                  : "Not submitted"}
              </p>

              <hr className="modal-divider" />

              <h4>{selectedSurvey.template?.name ?? "Survey"}</h4>

              {selectedSurvey.template?.questions.map((question) => (
                <div className="modal-detail-row" key={question.id}>
                  <span className="detail-label">{question.text}</span>
                  <span>
                    {String(
                      selectedSurvey.responses[question.id] ?? "No answer"
                    )}
                  </span>
                </div>
              ))}
              {selectedSurvey.survey_file && (
                <div className="modal-detail-row">
                  <span className="detail-label">Supporting File</span>
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}