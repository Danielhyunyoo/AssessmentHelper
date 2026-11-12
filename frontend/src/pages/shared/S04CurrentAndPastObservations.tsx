// src/pages/shared/S04CurrentAndPastObservations.tsx
import { useEffect, useState } from "react";
import {
  authApi,
  facultyApi,
  matchingApi,
  observationApi,
} from "../../api/endpoints";
import type {
  ObservationRecord,
  Professor,
  RegistrationStatus,
  ScheduledVisit,
} from "../../api/types";
import { Link } from "react-router-dom";

interface NormalizedVisit {
  pairingId: number;
  confirmedDatetime: string | null;
  observerId: number | null;
  observerName: string;
  observeeId: number | null;
  observeeName: string;
  courseCode: string;
  courseSection: string;
  courseTitle: string;
  courseSchedule: string;
  courseClassroom: string;
  statusLabel: string;
  fromScheduledEndpoint: boolean;
}

function getNumericId(obj: any): number | null {
  if (!obj || typeof obj !== "object") return null;
  const raw = obj.id ?? obj.user_id ?? obj.professor_id;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

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
  if (!value) return "Date & Time Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date & Time Pending";

  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPersonName(person: any, fallback: string): string {
  if (!person) return fallback;
  if (typeof person === "string") return person;
  if (person.name) return person.name;
  const full = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
  return full || person.username || fallback;
}

function normalizeScheduledVisit(raw: any, index: number): NormalizedVisit {
  const courseObj = raw.course ?? {};
  const dept =
    courseObj.department_code ?? raw.department_code ?? raw.subject ?? "";
  const num = courseObj.course_number ?? raw.course_number ?? "";
  const code =
    raw.course_code || [dept, num].filter(Boolean).join(" ") || "Course";

  return {
    pairingId: Number(raw.pairing_id ?? raw.id ?? index + 1),
    confirmedDatetime:
      raw.confirmed_datetime ?? raw.scheduled_datetime ?? raw.datetime ?? null,
    observerId: getNumericId(raw.observer) ?? (Number(raw.observer_id) || null),
    observerName: formatPersonName(
      raw.observer ?? raw.observer_name,
      "Assigned Observer"
    ),
    observeeId: getNumericId(raw.observee) ?? (Number(raw.observee_id) || null),
    observeeName: formatPersonName(
      raw.observee ?? raw.observee_name,
      "Assigned Observee"
    ),
    courseCode: code,
    courseSection: String(
      courseObj.section ?? raw.course_section ?? raw.section ?? ""
    ),
    courseTitle: courseObj.title ?? raw.course_title ?? raw.title ?? "",
    courseSchedule:
      courseObj.schedule ?? raw.schedule ?? raw.meeting_times ?? "",
    courseClassroom:
      courseObj.classroom ?? raw.classroom ?? raw.location ?? "",
    statusLabel: raw.status
      ? String(raw.status).charAt(0).toUpperCase() + String(raw.status).slice(1)
      : "Scheduled",
    fromScheduledEndpoint: true,
  };
}

export default function S04CurrentAndPastObservations() {
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [liveRecords, setLiveRecords] = useState<ObservationRecord[]>([]);
  const [normalizedVisits, setNormalizedVisits] = useState<NormalizedVisit[]>(
    []
  );
  const [registration, setRegistration] = useState<RegistrationStatus | null>(
    null
  );
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState("");

  const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLiveLoading(true);
      setLiveError("");

      try {
        const [
          session,
          records,
          scheduledRaw,
          registrationData,
          sentInvites,
          incomingInvites,
          profileData,
          matchesData,
        ] = await Promise.all([
          authApi.session().catch(() => ({ professor: null })),
          observationApi.list().catch(() => [] as ObservationRecord[]),
          observationApi.scheduled().catch(() => [] as ScheduledVisit[]),
          facultyApi.registrationStatus().catch(() => null),
          matchingApi.sentInvitations().catch(() => []),
          matchingApi.incomingInvitations().catch(() => []),
          facultyApi.profile().catch(() => null),
          matchingApi.matches().catch(() => null),
        ]);

        if (cancelled) return;

        const user = session?.professor ?? profileData?.professor ?? null;
        const userId = getNumericId(user);
        const userFullName = user
          ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
            user.username ||
            "Faculty Member"
          : "Faculty Member";

        setCurrentUser(user);
        setLiveRecords(Array.isArray(records) ? records : []);
        setRegistration(registrationData);

        // 1. Unwrap scheduled visits (handles [...] or { visits: [...] })
        const rawVisitList = Array.isArray(scheduledRaw)
          ? scheduledRaw
          : Array.isArray((scheduledRaw as any)?.visits)
          ? (scheduledRaw as any).visits
          : [];

        const visitsMap = new Map<number, NormalizedVisit>();
        rawVisitList.forEach((v: any, idx: number) => {
          const normalized = normalizeScheduledVisit(v, idx);
          visitsMap.set(normalized.pairingId, normalized);
        });

        // 2. Fallback: confirmed pairings from sentInvitations (Observee side)
        const candidateNameMap = Object.fromEntries(
          (matchesData?.candidates ?? []).map((c) => [c.id, c.name])
        );
        const observeeCourse = profileData?.selected_course;

        (Array.isArray(sentInvites) ? sentInvites : [])
          .filter((inv: any) => inv.status === "confirmed")
          .forEach((inv: any) => {
            const pId = Number(inv.pairing_id ?? inv.invitation_id);
            if (!visitsMap.has(pId)) {
              const acceptedSlot = (inv.proposed_dates ?? []).find(
                (d: any) => d.status === "accepted"
              );
              visitsMap.set(pId, {
                pairingId: pId,
                confirmedDatetime: acceptedSlot?.datetime ?? null,
                observerId: Number(inv.recipient_id) || null,
                observerName:
                  candidateNameMap[inv.recipient_id] ||
                  `Observer #${inv.recipient_id}`,
                observeeId: userId,
                observeeName: userFullName,
                courseCode: observeeCourse
                  ? `${observeeCourse.department_code} ${observeeCourse.course_number}`
                  : "Registered Course",
                courseSection: observeeCourse?.section ?? "",
                courseTitle: observeeCourse?.title ?? "",
                courseSchedule: observeeCourse?.schedule ?? "",
                courseClassroom: observeeCourse?.classroom ?? "",
                statusLabel: "Confirmed",
                fromScheduledEndpoint: false,
              });
            }
          });

        // 3. Fallback: confirmed pairings from incomingInvitations (Observer side)
        (Array.isArray(incomingInvites) ? incomingInvites : [])
          .filter((inv: any) => inv.status === "confirmed")
          .forEach((inv: any) => {
            const pId = Number(inv.pairing_id ?? inv.invitation_id);
            if (!visitsMap.has(pId)) {
              const acceptedSlot = (inv.proposed_dates ?? []).find(
                (d: any) => d.status === "accepted"
              );
              const invCourse = inv.course;
              visitsMap.set(pId, {
                pairingId: pId,
                confirmedDatetime: acceptedSlot?.datetime ?? null,
                observerId: userId,
                observerName: userFullName,
                observeeId:
                  getNumericId(inv.sender) ?? (Number(inv.sender_id) || null),
                observeeName: formatPersonName(
                  inv.sender,
                  "Assigned Observee"
                ),
                courseCode: invCourse
                  ? `${invCourse.department_code} ${invCourse.course_number}`
                  : "Assigned Course",
                courseSection: invCourse?.section ?? "",
                courseTitle: invCourse?.title ?? "",
                courseSchedule: invCourse?.schedule ?? "",
                courseClassroom: invCourse?.classroom ?? "",
                statusLabel: "Confirmed",
                fromScheduledEndpoint: false,
              });
            }
          });

        setNormalizedVisits(Array.from(visitsMap.values()));
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

    const handleRefresh = () => {
      void loadRecords();
    };
    window.addEventListener("notifications-changed", handleRefresh);
    window.addEventListener("demo-date-changed", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("notifications-changed", handleRefresh);
      window.removeEventListener("demo-date-changed", handleRefresh);
    };
  }, []);

  const toggleSemester = (semester: string) => {
    setOpenSemesters((prev) => ({
      ...prev,
      [semester]: !prev[semester],
    }));
  };

  const currentUserId = getNumericId(currentUser);
  const currentUserName = currentUser
    ? `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`
        .trim()
        .toLowerCase()
    : "";

  const isUserObserver = (
    observerId: number | null | undefined,
    observerName?: string
  ): boolean => {
    if (currentUserId !== null && observerId != null) {
      return Number(observerId) === currentUserId;
    }
    if (currentUserName && observerName) {
      return observerName.toLowerCase().includes(currentUserName);
    }
    return false;
  };

  // Records belonging to the signed-in user (both as observer and observee)
  const userRecords = liveRecords.filter((record) => {
    if (currentUserId === null) return true;
    return (
      getNumericId(record.observer) === currentUserId ||
      getNumericId(record.observee) === currentUserId
    );
  });

  const currentRecords = userRecords.filter(
    (record) => record.status !== "completed" && record.status !== "cancelled"
  );

  const pastRecords = userRecords.filter(
    (record) => record.status === "completed" || record.status === "cancelled"
  );

  // Exclude scheduled visits that already have an active or past ObservationRecord
  const existingRecordPairingIds = new Set(
    userRecords.map((r) => Number(r.pairing_id))
  );

  const activeScheduledVisits = normalizedVisits.filter((visit) => {
    if (existingRecordPairingIds.has(visit.pairingId)) return false;
    // Items directly from observationApi.scheduled() are already scoped to the current user
    if (visit.fromScheduledEndpoint) return true;
    if (currentUserId === null) return true;
    return (
      visit.observerId === currentUserId || visit.observeeId === currentUserId
    );
  });

  // Group past observations by semester
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
            <strong>Last Day for Classroom Visits and Signing Records</strong>
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

          {currentRecords.length === 0 && activeScheduledVisits.length === 0 ? (
            <div className="table-container theme-blue summary-card-padding">
              <div className="observation-empty-state">
                No current observations or confirmed peer pairings yet.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {/* Confirmed / Scheduled Visits (Before Record Opens) */}
              {activeScheduledVisits.map((visit) => {
                const asObserver = isUserObserver(
                  visit.observerId,
                  visit.observerName
                );
                const fullCourseHeader = [
                  visit.courseSection
                    ? `${visit.courseCode}.${visit.courseSection}`
                    : visit.courseCode,
                  visit.courseTitle,
                ]
                  .filter(Boolean)
                  .join(" — ");

                return (
                  <article
                    key={`visit-${visit.pairingId}`}
                    className={`table-container ${
                      asObserver ? "theme-green" : "theme-orange"
                    } summary-card-padding`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.85rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.75rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className={`pill-badge ${
                            asObserver ? "pill-observer" : "pill-observee"
                          }`}
                        >
                          Role: {asObserver ? "Observer" : "Observee"}
                        </span>

                        <span
                          className="version-pill font-semibold"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {visit.statusLabel}
                        </span>
                      </div>

                      <h4
                        style={{
                          fontSize: "1.1rem",
                          margin: "0 0 0.65rem 0",
                          lineHeight: 1.35,
                        }}
                      >
                        {fullCourseHeader}
                      </h4>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                          fontSize: "0.925rem",
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>Scheduled Visit:</strong>{" "}
                          {formatObservationDate(visit.confirmedDatetime)}
                        </p>

                        <p style={{ margin: 0 }}>
                          <strong>
                            {asObserver ? "Observee:" : "Matched Observer:"}
                          </strong>{" "}
                          {asObserver
                            ? visit.observeeName
                            : visit.observerName}
                        </p>

                        {visit.courseSchedule && (
                          <p style={{ margin: 0 }}>
                            <strong>Class Schedule:</strong>{" "}
                            {visit.courseSchedule}
                          </p>
                        )}

                        <p style={{ margin: 0 }}>
                          <strong>Classroom:</strong>{" "}
                          {visit.courseClassroom || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: "0.75rem",
                        borderTop: "1px solid rgba(148, 163, 184, 0.25)",
                        fontSize: "0.82rem",
                        opacity: 0.85,
                      }}
                    >
                      The evaluation form opens once the scheduled classroom
                      visit takes place.
                    </div>
                  </article>
                );
              })}

              {/* Active Observation Records (In Progress / Awaiting Signatures) */}
              {currentRecords.map((record) => {
                const asObserver = isUserObserver(
                  getNumericId(record.observer),
                  record.observer?.name
                );
                const fullCourseHeader = [
                  record.course?.section
                    ? `${record.course.department_code} ${record.course.course_number}.${record.course.section}`
                    : `${record.course.department_code} ${record.course.course_number}`,
                  record.course?.title,
                ]
                  .filter(Boolean)
                  .join(" — ");

                return (
                  <article
                    key={record.observation_id}
                    className={`table-container ${
                      asObserver ? "theme-green" : "theme-orange"
                    } summary-card-padding`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.85rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.75rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className={`pill-badge ${
                            asObserver ? "pill-observer" : "pill-observee"
                          }`}
                        >
                          Role: {asObserver ? "Observer" : "Observee"}
                        </span>

                        <span
                          className="version-pill font-semibold"
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "capitalize",
                          }}
                        >
                          {record.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <h4
                        style={{
                          fontSize: "1.1rem",
                          margin: "0 0 0.65rem 0",
                          lineHeight: 1.35,
                        }}
                      >
                        {fullCourseHeader}
                      </h4>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                          fontSize: "0.925rem",
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>Observation Date:</strong>{" "}
                          {formatObservationDate(record.confirmed_datetime)}
                        </p>

                        <p style={{ margin: 0 }}>
                          <strong>
                            {asObserver ? "Observee:" : "Matched Observer:"}
                          </strong>{" "}
                          {asObserver
                            ? record.observee.name
                            : record.observer.name}
                        </p>

                        {record.course?.schedule && (
                          <p style={{ margin: 0 }}>
                            <strong>Class Schedule:</strong>{" "}
                            {record.course.schedule}
                          </p>
                        )}

                        {record.course?.classroom && (
                          <p style={{ margin: 0 }}>
                            <strong>Classroom:</strong>{" "}
                            {record.course.classroom}
                          </p>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            flexWrap: "wrap",
                            marginTop: "0.35rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span>
                            <strong>Observer Sign-off:</strong>{" "}
                            {record.observer_signed ? "Complete" : "Pending"}
                          </span>
                          <span>
                            <strong>Observee Sign-off:</strong>{" "}
                            {record.observee_signed ? "Complete" : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: "0.75rem",
                        borderTop: "1px solid rgba(148, 163, 184, 0.25)",
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Link
                        to={`/shared/observation-record/${record.observation_id}`}
                        className="btn-primary"
                      >
                        Open Observation Record
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
                    <span>{openSemesters[semester] ? "▲" : "▼"}</span>
                  </div>

                  {openSemesters[semester] && (
                    <div className="accordion-content">
                      <div className="observation-cards-container">
                        {pastRecordsBySemester[semester].map((record) => {
                          const asObserver = isUserObserver(
                            getNumericId(record.observer),
                            record.observer?.name
                          );
                          const courseHeader = [
                            record.course?.section
                              ? `${record.course.department_code} ${record.course.course_number}.${record.course.section}`
                              : `${record.course.department_code} ${record.course.course_number}`,
                            record.course?.title,
                          ]
                            .filter(Boolean)
                            .join(" — ");

                          return (
                            <article
                              className="observation-card-history"
                              key={record.observation_id}
                            >
                              <div className="observation-card-header">
                                <strong className="observation-card-title">
                                  {courseHeader} —{" "}
                                  {formatObservationDate(
                                    record.confirmed_datetime
                                  )}
                                </strong>

                                <span
                                  className={`pill-badge ${
                                    asObserver
                                      ? "pill-observer"
                                      : "pill-observee"
                                  }`}
                                >
                                  {asObserver ? "Observer" : "Observee"}
                                </span>
                              </div>

                              <p className="observation-card-text">
                                <strong>
                                  {asObserver ? "Observee:" : "Observer:"}
                                </strong>{" "}
                                {asObserver
                                  ? record.observee.name
                                  : record.observer.name}
                              </p>

                              {record.course?.schedule && (
                                <p className="observation-card-text">
                                  <strong>Schedule:</strong>{" "}
                                  {record.course.schedule}
                                </p>
                              )}

                              {record.course?.classroom && (
                                <p className="observation-card-text">
                                  <strong>Classroom:</strong>{" "}
                                  {record.course.classroom}
                                </p>
                              )}

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
            <Link to="/shared/faculty-dashboard" className="btn-secondary">
              Return to Dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}