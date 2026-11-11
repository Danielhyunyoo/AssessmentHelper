
import { useEffect, useState } from "react";
import { authApi, facultyApi, observationApi } from "../../api/endpoints";
import type {
  ObservationRecord,
  Professor,
  RegistrationStatus,
  ScheduledVisit,
} from "../../api/types";
import { Link } from "react-router-dom";

function formatReminderDate(value?: string) {
  if (!value) return "Not available";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSemester(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 0 && month <= 4) return `Spring ${year}`;
  if (month >= 5 && month <= 6) return `Summer ${year}`;
  return `Fall ${year}`;
}

function formatObservationDate(value?: string | null) {
  if (!value) return "Date not available";

  return new Date(value).toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function S04CurrentAndPastObservations() {
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [liveRecords, setLiveRecords] = useState<ObservationRecord[]>([]);
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([]);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState("");

  const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>({});

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
        setScheduledVisits(await observationApi.scheduled());
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

  const toggleSemester = (semester: string) => {
    setOpenSemesters((prev) => ({
      ...prev,
      [semester]: !prev[semester],
    }));
  };

  // Only show records belonging to the signed-in user.
  const userRecords = liveRecords.filter(
    (record) =>
      record.observer.id === currentUser?.id ||
      record.observee.id === currentUser?.id
  );

  const currentRecords = userRecords.filter(
    (record) =>
      record.status !== "completed" && record.status !== "cancelled"
  );

  const pastRecords = userRecords.filter(
    (record) =>
      record.status === "completed" || record.status === "cancelled"
  );

  // Group past observations by the semester in which they occurred.
  const pastRecordsBySemester = pastRecords.reduce<
    Record<string, ObservationRecord[]>
  >((groups, record) => {
    const semester = getSemester(record.confirmed_datetime);

    if (!groups[semester]) {
      groups[semester] = [];
    }

    groups[semester].push(record);
    return groups;
  }, {});

  const sortedSemesters = Object.keys(pastRecordsBySemester).sort((a, b) => {
    if (a === "Date unavailable") return 1;
    if (b === "Date unavailable") return -1;

    const getSortValue = (semester: string) => {
      const [season, year] = semester.split(" ");
      const seasonOrder: Record<string, number> = {
        Spring: 1,
        Summer: 2,
        Fall: 3,
      };

      return Number(year) * 10 + (seasonOrder[season] ?? 0);
    };

    return getSortValue(b) - getSortValue(a);
  });

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Current and Past Observations</h2>

      {/* Reminders Banner */}
      <section className="table-container theme-orange reminders-card">
        <h3 className="reminders-title">DEADLINE REMINDERS</h3>

        <div className="reminders-grid">
          <div>
            <strong>Course Registration Cutoff</strong>
            <p className="reminder-date">
              {formatReminderDate(registration?.signup_deadline)}
            </p>
          </div>

          <div>
            <strong>
              Last Day for Classroom Visits and Signing Records
            </strong>
            <p className="reminder-date">
              {formatReminderDate(registration?.observation_deadline)}
            </p>
          </div>

          <div>
            <strong>End-Of-Process Survey Completion Deadline</strong>
            <p className="reminder-date">
              {formatReminderDate(registration?.survey_deadline)}
            </p>
          </div>
        </div>
      </section>

      {/* Loading and Error States */}
      {liveLoading && <p>Loading observation records...</p>}

      {liveError && (
        <div role="alert" className="yellow-banner">
          {liveError}
        </div>
      )}

      {/* Ongoing Evaluations */}
      {!liveLoading && !liveError && (
        <section className="dashboard-phase">
          <h3>Ongoing Evaluations</h3>

          <div className="table-container accordion-wrapper">
            <div className="accordion-content">
              {currentRecords.length === 0 && scheduledVisits.length === 0 ? (
                <div className="observation-empty-state">
                  No current observations.
                </div>
              ) : (
                <div className="observation-cards-container">
                  {scheduledVisits.map((visit) => {
                    const isObserver = visit.observer.id === currentUser?.id;

                    return (
                      <article className="observation-card-history" key={`visit-${visit.pairing_id}`}>
                        <div className="observation-card-header">
                          <strong className="observation-card-title">
                            {formatObservationDate(visit.confirmed_datetime)}
                          </strong>
                          <span className={`pill-badge ${isObserver ? "pill-observer" : "pill-observee"}`}>
                            {isObserver ? "Observer" : "Observee"}
                          </span>
                        </div>

                        <p className="observation-card-text">
                          <strong>{isObserver ? "Observee:" : "Observer:"}</strong>{" "}
                          {isObserver ? visit.observee.name : visit.observer.name}
                        </p>

                        <p className="observation-card-text">
                          <strong>Course:</strong> {visit.course.department_code} {visit.course.course_number}
                        </p>

                        <p className="observation-card-text">
                          <strong>Section:</strong> {visit.course.section}
                        </p>

                        <p className="observation-card-subtext">
                          <strong>Status:</strong> Scheduled
                        </p>

                        <p className="observation-card-subtext">
                          The observation record opens after the visit.
                        </p>
                      </article>
                    );
                  })}
                  {currentRecords.map((record) => {
                    const isObserver =
                      record.observer.id === currentUser?.id;

                    return (
                      <article
                        className="observation-card-history"
                        key={record.observation_id}
                      >
                        <div className="observation-card-header">
                          <strong className="observation-card-title">
                            {formatObservationDate(
                              record.confirmed_datetime
                            )}
                          </strong>

                          <span
                            className={`pill-badge ${
                              isObserver
                                ? "pill-observer"
                                : "pill-observee"
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
                          <strong>Section:</strong>{" "}
                          {record.course.section}
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

                        <p className="observation-card-subtext">
                          <strong>Record:</strong>{" "}
                          {record.locked
                            ? "Finalized / locked"
                            : "In progress"}
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
              )}
            </div>
          </div>
        </section>
      )}

      {/* Past Evaluations Accordion */}
      {!liveLoading && !liveError && (
        <section className="dashboard-phase">
          <h3>Past Evaluations</h3>

          {pastRecords.length === 0 ? (
            <div className="table-container theme-green summary-card-padding">
              <div className="observation-empty-state">
                No completed or cancelled observation records.
              </div>
            </div>
          ) : (
            <div className="table-container accordion-wrapper">
              {sortedSemesters.map((semester) => (
                <div className="accordion-item" key={semester}>
                  <div
                    className="accordion-header"
                    role="button"
                    tabIndex={0}
                    aria-expanded={!!openSemesters[semester]}
                    onClick={() => toggleSemester(semester)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleSemester(semester);
                      }
                    }}
                  >
                    <span>{semester}</span>
                    <span>
                      {openSemesters[semester] ? "▲" : "▼"}
                    </span>
                  </div>

                  {openSemesters[semester] && (
                    <div className="accordion-content">
                      <div className="observation-cards-container">
                        {pastRecordsBySemester[semester].map((record) => {
                          const isObserver =
                            record.observer.id === currentUser?.id;

                          return (
                            <article
                              className="observation-card-history"
                              key={record.observation_id}
                            >
                              <div className="observation-card-header">
                                <strong className="observation-card-title">
                                  {formatObservationDate(
                                    record.confirmed_datetime
                                  )}
                                </strong>

                                <span
                                  className={`pill-badge ${
                                    isObserver
                                      ? "pill-observer"
                                      : "pill-observee"
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
                                <strong>Section:</strong>{" "}
                                {record.course.section}
                              </p>

                              <p className="observation-card-subtext">
                                <strong>Status:</strong> {record.status}
                              </p>

                              <p className="observation-card-subtext">
                                <strong>Finalized:</strong>{" "}
                                {record.observee_signed_at
                                  ? new Date(
                                      record.observee_signed_at
                                    ).toLocaleString()
                                  : "Not finalized"}
                              </p>

                              <p className="observation-card-subtext">
                                <strong>Record:</strong>{" "}
                                {record.locked
                                  ? "Finalized / locked"
                                  : "Not locked"}
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
                </div>
              ))}
            </div>
          )}

          {/* Bottom Centered Return Button */}
          <div className="dashboard-center-action">
            <Link
              to="/shared/faculty-dashboard"
              className="btn-secondary"
            >
              Return to Dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}