import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { ObservationRecord } from "../../api/types";

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

  async function handleReminder(pairingId: number) {
    try {
      await committeeApi.remindRecord(pairingId);
      setMessage("Reminder sent to the faculty member who needs to act.");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reminder.");
    }
  }

  const [selectedRecord, setSelectedRecord] =
    useState<ObservationRecord | null>(null);

  async function openCompletedRecord(id: number) {
    try {
      const record = await committeeApi.observationDetail(id);
      setSelectedRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load record.");
    }
  }

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Return to Dashboard
        </Link>
      </div>

      <h2>View Pending Observation Records</h2>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* SECTION 1: PENDING EVALUATION FORMS */}
      <section className="dashboard-phase">
        <h3>Pending Evaluation Forms</h3>

        {/* Blue Theme Table Box Container */}
        <div className="table-container theme-blue">
          <div className="table-instruction">
            Select a Professor's name to remind them to complete their Evaluation Form.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th scope="col">Faculty Member</th>
                  <th scope="col">Department</th>
                  <th scope="col">Academic Rank</th>
                  <th scope="col">Outstanding Item</th>
                  <th className="align-center" scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending?.records.map((record) => (
                  <tr key={record.pairing_id}>
                    <td className="font-semibold">{record.observee_name}</td>

                    <td>{record.department ?? "Not provided"}</td>

                    <td>{record.academic_rank || "Not provided"}</td>

                    <td>
                      {record.missing === "observer_submission"
                        ? "Observer needs to complete form"
                        : "Observee needs to sign"}
                    </td>

                    <td className="align-center">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => void handleReminder(record.pairing_id)}
                      >
                        Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}

                {pending && pending.records.length === 0 && (
                  <tr>
                    <td colSpan={5}>No pending observation records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: VIEW COMPLETED OBSERVATION RECORDS (MATCHES A06 TABLE FORMAT) */}
      <section className="dashboard-phase phase-spacing">
        <h3>View Completed Observation Records</h3>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select View Details to see a summary of the completed observation record.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
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
                {completed.map((record) => (
                  <tr key={record.observation_id}>
                    <td>{record.observee_name}</td>
                    <td>{record.department ?? "Not provided"}</td>
                    <td>{record.academic_rank || "Not provided"}</td>
                    <td>
                      {record.completed_at
                        ? new Date(record.completed_at).toLocaleDateString()
                        : "Not provided"}
                    </td>
                    <td className="align-center">
                      <button
                        type="button"
                        className="table-name-link"
                        onClick={() => void openCompletedRecord(record.observation_id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}

                {completed.length === 0 && (
                  <tr>
                    <td colSpan={5}>No completed observation records.</td>
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

      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div
            className="modal-content-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header-bar">
              <h3>Observation Record Details</h3>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <div className="modal-details-list">
              <div className="modal-detail-row">
                <span className="detail-label">Observer:</span>
                <span>{selectedRecord.observer.name}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observee:</span>
                <span>{selectedRecord.observee.name}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Course:</span>
                <span>
                  {selectedRecord.course.department_code}{" "}
                  {selectedRecord.course.course_number}.
                  {selectedRecord.course.section}
                </span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observation Date:</span>
                <span>
                  {selectedRecord.confirmed_datetime
                    ? new Date(selectedRecord.confirmed_datetime).toLocaleString()
                    : "Not scheduled"}
                </span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observer Signature:</span>
                <span>
                  {selectedRecord.observer_signed ? "Complete" : "Pending"}
                </span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observee Signature:</span>
                <span>
                  {selectedRecord.observee_signed ? "Complete" : "Pending"}
                </span>
              </div>

              <hr className="modal-divider" />

              <h4>{selectedRecord.template.name}</h4>

              {selectedRecord.template.questions.map((question) => (
                <div key={question.id} className="modal-detail-row">
                  <span className="detail-label">{question.text}</span>
                  <span>
                    {String(
                      selectedRecord.responses[question.id] ?? "No answer"
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}