// src/pages/shared/S04CurrentAndPastObservations.tsx
import { useEffect, useState } from "react";
import { authApi, facultyApi, observationApi } from "../../api/endpoints";
import type { ObservationRecord, Professor, RegistrationStatus } from "../../api/types";
import { Link } from "react-router-dom";

function formatReminderDate(value?: string) {
  if (!value) return "Not available";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function S04CurrentAndPastObservations() {
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [liveRecords, setLiveRecords] = useState<ObservationRecord[]>([]);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLiveLoading(true);
      setLiveError("");

      try {
        const [session, records, registrationData] = await Promise.all([
          authApi.session(),
          observationApi.list(),
          facultyApi.registrationStatus(),
        ]);

        if (cancelled) return;

        setCurrentUser(session.professor);
        setLiveRecords(records);
        setRegistration(registrationData);
      } catch (err) {
        if (!cancelled) {
          setLiveError(
            err instanceof Error
              ? err.message
              : "Unable to load your observation records."
          );
        }
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentRecords = liveRecords.filter(
    (record) => record.status !== "completed" && record.status !== "cancelled"
  );

  const pastRecords = liveRecords.filter(
    (record) => record.status === "completed" || record.status === "cancelled"
  );

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          Back to Dashboard
        </Link>
      </div>

      <h2>Current and Past Observations</h2>

      {liveLoading && <p>Loading observation records...</p>}
      {liveError && <p role="alert">{liveError}</p>}

      {/* Reminders Banner */}
      <section className="table-container theme-orange reminders-card">
        <h3 className="reminders-title">DEADLINE REMINDERS</h3>

        <div className="reminders-grid">
          <div>
            <strong>Course Registration Cutoff</strong>
            <p className="reminder-date">{formatReminderDate(registration?.signup_deadline)}</p>
          </div>
          <div>
            <strong>Last Day for Classroom Visits and Signing Records</strong>
            <p className="reminder-date">{formatReminderDate(registration?.observation_deadline)}</p>
          </div>
          <div>
            <strong>End-Of-Process Survey Completion Deadline</strong>
            <p className="reminder-date">{formatReminderDate(registration?.survey_deadline)}</p>
          </div>
        </div>
      </section>

      {/* Current Observations Section */}
      <section className="dashboard-phase">
        <h3>Current Evaluations</h3>

        {currentRecords.length === 0 ? (
          <div className="table-container theme-green">
            <div className="observation-empty-state">
              No current observations.
            </div>
          </div>
        ) : (
          <div className="table-container theme-green observation-card-wrapper">
            <div className="observation-cards-container">
              {currentRecords.map((record) => {
                const userId = currentUser?.id;
                const isObserver = record.observer.id === userId;

                return (
                  <article
                    className="observation-card-history"
                    key={record.observation_id}
                  >
                    <div className="observation-card-header">
                      <strong className="observation-card-title">
                        {record.confirmed_datetime
                          ? new Date(record.confirmed_datetime).toLocaleString()
                          : "Date not confirmed"}
                      </strong>

                      <span
                        className={`pill-badge ${
                          isObserver ? "pill-observer" : "pill-observee"
                        }`}
                      >
                        {isObserver ? "Observer" : "Observee"}
                      </span>
                    </div>

                    <p className="observation-card-text">
                      <strong>
                        {isObserver ? "Observee:" : "Observer:"}
                      </strong>{" "}
                      {isObserver
                        ? record.observee.name
                        : record.observer.name}
                    </p>

                    <p className="observation-card-text">
                      <strong>Course:</strong>{" "}
                      {record.course.department_code}{" "}
                      {record.course.course_number}
                    </p>

                    <p className="observation-card-text">
                      <strong>Section:</strong> {record.course.section}
                    </p>

                    <p className="observation-card-subtext">
                      <strong>Status:</strong> {record.status}
                    </p>

                    <p className="observation-card-subtext">
                      <strong>Observer signature:</strong>{" "}
                      {record.observer_signed ? "Complete" : "Pending"}
                    </p>

                    <p className="observation-card-subtext">
                      <strong>Observee signature:</strong>{" "}
                      {record.observee_signed ? "Complete" : "Pending"}
                    </p>

                    <div className="observation-card-actions">
                      <Link
                        to={`/shared/observation-record/${record.observation_id}`}
                        className="btn-primary"
                      >
                        View Observation Record
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
      
      {/* Past Evaluations Accordion Section */}
      <section className="dashboard-phase">
        <h3>Past Evaluations</h3>

        {pastRecords.length === 0 ? (
          <div className="table-container theme-green">
            <div className="observation-empty-state">
              No completed or cancelled observation records.
            </div>
          </div>
        ) : (
          <div className="table-container theme-green">
            <div className="observation-cards-container">
              {pastRecords.map((record) => {
                const userId = currentUser?.id;
                const isObserver = record.observer.id === userId;

                return (
                  <article
                    className="observation-card-history"
                    key={record.observation_id}
                  >
                    <div className="observation-card-header">
                      <strong className="observation-card-title">
                        {record.confirmed_datetime
                          ? new Date(record.confirmed_datetime).toLocaleString()
                          : "Date unavailable"}
                      </strong>

                      <span
                        className={`pill-badge ${
                          isObserver ? "pill-observer" : "pill-observee"
                        }`}
                      >
                        {isObserver ? "Observer" : "Observee"}
                      </span>
                    </div>

                    <p className="observation-card-text">
                      <strong>
                        {isObserver ? "Observee:" : "Observer:"}
                      </strong>{" "}
                      {isObserver
                        ? record.observee.name
                        : record.observer.name}
                    </p>

                    <p className="observation-card-text">
                      <strong>Course:</strong>{" "}
                      {record.course.department_code}{" "}
                      {record.course.course_number}
                    </p>

                    <p className="observation-card-text">
                      <strong>Section:</strong> {record.course.section}
                    </p>

                    <p className="observation-card-subtext">
                      <strong>Status:</strong> {record.status}
                    </p>

                    <p className="observation-card-subtext">
                      <strong>Finalized:</strong>{" "}
                      {record.observee_signed_at
                        ? new Date(record.observee_signed_at).toLocaleString()
                        : "Not finalized"}
                    </p>

                    <div className="observation-card-actions">
                      <Link
                        to={`/shared/observation-record/${record.observation_id}`}
                        className="btn-primary"
                      >
                        View Observation Record
                      </Link>

                      {record.status === "completed" && (
                        <Link
                          to={`/shared/post-evaluation-survey?pairingId=${record.pairing_id}`}
                          className="btn-secondary"
                        >
                          Post-Evaluation Survey
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="dashboard-center-action">
          <Link to="/shared/faculty-dashboard" className="btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}