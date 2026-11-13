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
import { formatDateTime } from "../../api/format";

const STATUS_LABELS: Record<string, string> = {
  draft: "In progress",
  awaiting_observee_signature: "Waiting for the observee to sign",
  completed: "Completed",
  cancelled: "Cancelled",
};

const AWAITING_CONFIRMATION = "Waiting for confirmation";

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

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

function buildVisitKey(
  observerId: number | null,
  observeeId: number | null,
  confirmedDatetime: string | null,
  fallbackId: number
): string {
  const timeKey = confirmedDatetime
    ? String(new Date(confirmedDatetime).getTime())
    : "no-date";
  if (observerId && observeeId) {
    return `${observerId}-${observeeId}-${timeKey}`;
  }
  return `pairing-${fallbackId}`;
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

        const rawVisitList = Array.isArray(scheduledRaw)
          ? scheduledRaw
          : Array.isArray((scheduledRaw as any)?.visits)
          ? (scheduledRaw as any).visits
          : [];

        const visitsMap = new Map<string, NormalizedVisit>();
        rawVisitList.forEach((v: any, idx: number) => {
          const normalized = normalizeScheduledVisit(v, idx);
          const key = buildVisitKey(
            normalized.observerId,
            normalized.observeeId,
            normalized.confirmedDatetime,
            normalized.pairingId
          );
          visitsMap.set(key, normalized);
        });

        const candidateNameMap = Object.fromEntries(
          (matchesData?.candidates ?? []).map((c) => [c.id, c.name])
        );
        const observeeCourse = profileData?.selected_course;

        (Array.isArray(sentInvites) ? sentInvites : [])
          .filter((inv: any) => inv.status === "confirmed" || inv.status === "accepted")
          .forEach((inv: any) => {
            const pId = Number(inv.pairing_id ?? inv.invitation_id);
            const acceptedSlot = (inv.proposed_dates ?? []).find(
              (d: any) => d.status === "accepted"
            );
            const obsId = Number(inv.recipient_id) || null;
            const dt = acceptedSlot?.datetime ?? null;
            const key = buildVisitKey(obsId, userId, dt, pId);

            if (!visitsMap.has(key)) {
              visitsMap.set(key, {
                pairingId: pId,
                confirmedDatetime: dt,
                observerId: obsId,
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
                statusLabel: inv.status === "accepted" ? AWAITING_CONFIRMATION : "Confirmed",
                fromScheduledEndpoint: false,
              });
            }
          });

        (Array.isArray(incomingInvites) ? incomingInvites : [])
          .filter((inv: any) => inv.status === "confirmed" || inv.status === "accepted")
          .forEach((inv: any) => {
            const pId = Number(inv.pairing_id ?? inv.invitation_id);
            const acceptedSlot = (inv.proposed_dates ?? []).find(
              (d: any) => d.status === "accepted"
            );
            const observeeId =
              getNumericId(inv.sender) ?? (Number(inv.sender_id) || null);
            const dt = acceptedSlot?.datetime ?? null;
            const key = buildVisitKey(userId, observeeId, dt, pId);

            if (!visitsMap.has(key)) {
              const invCourse = inv.course;
              visitsMap.set(key, {
                pairingId: pId,
                confirmedDatetime: dt,
                observerId: userId,
                observerName: userFullName,
                observeeId,
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
                statusLabel: inv.status === "accepted" ? AWAITING_CONFIRMATION : "Confirmed",
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
      [semester]: !isOpen(semester),
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

  const existingRecordPairingIds = new Set(
    userRecords.map((r) => Number(r.pairing_id))
  );
  const existingRecordKeys = new Set(
    userRecords.map((r) =>
      buildVisitKey(
        getNumericId(r.observer),
        getNumericId(r.observee),
        r.confirmed_datetime,
        Number(r.pairing_id)
      )
    )
  );

  const activeScheduledVisits = normalizedVisits.filter((visit) => {
    if (existingRecordPairingIds.has(visit.pairingId)) return false;
    const visitKey = buildVisitKey(
      visit.observerId,
      visit.observeeId,
      visit.confirmedDatetime,
      visit.pairingId
    );
    if (existingRecordKeys.has(visitKey)) return false;
    if (visit.fromScheduledEndpoint) return true;
    if (currentUserId === null) return true;
    return (
      visit.observerId === currentUserId || visit.observeeId === currentUserId
    );
  });

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

  const isOpen = (semester: string) =>
    openSemesters[semester] ?? semester === sortedSemesters[0];

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
            <div className="ongoing-observations-grid">
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
                  .join(": ");

                return (
                  <article
                    key={`visit-${visit.pairingId}`}
                    className={`table-container ${
                      asObserver ? "theme-green" : "theme-orange"
                    } ongoing-observation-card`}
                  >
                    <div>
                      <div className="ongoing-card-top-row">
                        <span
                          className={`pill-badge ${
                            asObserver ? "pill-observer" : "pill-observee"
                          }`}
                        >
                          Role: {asObserver ? "Observer" : "Observee"}
                        </span>

                        <span className="version-pill font-semibold ongoing-status-pill">
                          {visit.statusLabel}
                        </span>
                      </div>

                      <h4 className="ongoing-card-title">{fullCourseHeader}</h4>

                      <div className="ongoing-card-details">
                        <p>
                          <strong>Scheduled Visit:</strong>{" "}
                          {formatObservationDate(visit.confirmedDatetime)}
                        </p>

                        <p>
                          <strong>
                            {asObserver ? "Observee:" : "Matched Observer:"}
                          </strong>{" "}
                          {asObserver
                            ? visit.observeeName
                            : visit.observerName}
                        </p>

                        {visit.courseSchedule && (
                          <p>
                            <strong>Class Schedule:</strong>{" "}
                            {visit.courseSchedule}
                          </p>
                        )}

                        <p>
                          <strong>Classroom:</strong>{" "}
                          {visit.courseClassroom || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="ongoing-card-footer-note">
                      {visit.statusLabel !== AWAITING_CONFIRMATION ? (
                        "The evaluation form opens once the scheduled classroom visit takes place."
                      ) : asObserver ? (
                        "You accepted this date. The observee still has to confirm the visit."
                      ) : (
                        <>
                          This observer accepted.{" "}
                          <Link to="/observee/observer-selection">Confirm the visit</Link> to schedule it.
                        </>
                      )}
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
                  .join(": ");

                return (
                  <article
                    key={record.observation_id}
                    className={`table-container ${
                      asObserver ? "theme-green" : "theme-orange"
                    } ongoing-observation-card`}
                  >
                    <div>
                      <div className="ongoing-card-top-row">
                        <span
                          className={`pill-badge ${
                            asObserver ? "pill-observer" : "pill-observee"
                          }`}
                        >
                          Role: {asObserver ? "Observer" : "Observee"}
                        </span>

                        <span className="version-pill font-semibold ongoing-status-pill">
                          {statusLabel(record.status)}
                        </span>
                      </div>

                      <h4 className="ongoing-card-title">{fullCourseHeader}</h4>

                      <div className="ongoing-card-details">
                        <p>
                          <strong>Observation Date:</strong>{" "}
                          {formatObservationDate(record.confirmed_datetime)}
                        </p>

                        <p>
                          <strong>
                            {asObserver ? "Observee:" : "Matched Observer:"}
                          </strong>{" "}
                          {asObserver
                            ? record.observee.name
                            : record.observer.name}
                        </p>

                        {record.course?.schedule && (
                          <p>
                            <strong>Class Schedule:</strong>{" "}
                            {record.course.schedule}
                          </p>
                        )}

                        {record.course?.classroom && (
                          <p>
                            <strong>Classroom:</strong>{" "}
                            {record.course.classroom}
                          </p>
                        )}

                        <div className="ongoing-signoff-row">
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

                    <div className="ongoing-card-footer-actions">
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
                    aria-expanded={isOpen(semester)}
                    onClick={() => toggleSemester(semester)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleSemester(semester);
                      }
                    }}
                  >
                    <span>{semester}</span>
                    <span>{isOpen(semester) ? "▲" : "▼"}</span>
                  </div>

                  {isOpen(semester) && (
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
                            .join(": ");

                          return (
                            <article
                              className="observation-card-history"
                              key={record.observation_id}
                            >
                              <div className="observation-card-header">
                                <strong className="observation-card-title">
                                  {courseHeader} ·{" "}
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
                                <strong>Status:</strong> {statusLabel(record.status)}
                              </p>

                              <p className="observation-card-subtext">
                                <strong>Finalized:</strong>{" "}
                                {record.observee_signed_at
                                  ? formatDateTime(record.observee_signed_at)
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