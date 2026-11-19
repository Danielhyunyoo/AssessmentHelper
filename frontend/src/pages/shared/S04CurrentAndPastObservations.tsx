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
import { isUserTransferredToNextCycle } from "../committee/A02FacultyMatching";

const L03_ROUTE = "/login/signin2";

const STATUS_LABELS: Record<string, string> = {
  draft: "In progress",
  awaiting_observee_signature: "Waiting for observee signature",
  completed: "Completed",
  cancelled: "Cancelled",
};

const AWAITING_CONFIRMATION = "Waiting for confirmation";

type RoleFilter = "all" | "observer" | "observee";

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

function getNumericId(obj: unknown): number | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  const raw = rec.id ?? rec.user_id ?? rec.professor_id;
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
  if (!value) return "Date and Time Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date and Time Pending";

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPersonName(person: unknown, fallback: string): string {
  if (!person) return fallback;
  if (typeof person === "string") return person;
  if (typeof person === "object") {
    const p = person as Record<string, unknown>;
    if (typeof p.name === "string" && p.name) return p.name;
    const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    if (full) return full;
    if (typeof p.username === "string" && p.username) return p.username;
  }
  return fallback;
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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
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

        const recordList = Array.isArray(records) ? records : [];

        setCurrentUser(user);
        setLiveRecords(recordList);
        setRegistration(registrationData);

        const sentList = Array.isArray(sentInvites) ? sentInvites : [];
        const incomingList = Array.isArray(incomingInvites)
          ? incomingInvites
          : [];

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

        sentList
          .filter(
            (inv) => inv.status === "confirmed" || inv.status === "accepted"
          )
          .forEach((inv) => {
            const invRecord = inv as unknown as Record<string, unknown>;
            const pId = Number(invRecord.pairing_id ?? inv.invitation_id);
            const acceptedSlot = (inv.proposed_dates ?? []).find(
              (d) => d.status === "accepted"
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
                statusLabel:
                  inv.status === "accepted"
                    ? AWAITING_CONFIRMATION
                    : "Confirmed",
                fromScheduledEndpoint: false,
              });
            }
          });

        incomingList
          .filter(
            (inv) => inv.status === "confirmed" || inv.status === "accepted"
          )
          .forEach((inv) => {
            const invRecord = inv as unknown as Record<string, unknown>;
            const pId = Number(invRecord.pairing_id ?? inv.invitation_id);
            const acceptedSlot = (inv.proposed_dates ?? []).find(
              (d) => d.status === "accepted"
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
                statusLabel:
                  inv.status === "accepted"
                    ? AWAITING_CONFIRMATION
                    : "Confirmed",
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
    window.addEventListener("profile-changed", handleRefresh);
    window.addEventListener("simulated-date-changed", handleRefresh);
    window.addEventListener("demo-date-changed", handleRefresh);
    window.addEventListener("cycle-transfers-updated", handleRefresh);
    window.addEventListener("demo-reset", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("notifications-changed", handleRefresh);
      window.removeEventListener("profile-changed", handleRefresh);
      window.removeEventListener("simulated-date-changed", handleRefresh);
      window.removeEventListener("demo-date-changed", handleRefresh);
      window.removeEventListener("cycle-transfers-updated", handleRefresh);
      window.removeEventListener("demo-reset", handleRefresh);
    };
  }, []);

  const toggleSemester = (semester: string) => {
    setOpenSemesters((prev) => ({
      ...prev,
      [semester]: !isOpen(semester),
    }));
  };

  const isCommitteeMember = currentUser?.role === "admin";
  const isTransferredToNextCycle = isUserTransferredToNextCycle(
    currentUser,
    registration
  );
  const isCycleRegistered =
    isCommitteeMember ||
    (Boolean(registration?.is_registered) && !isTransferredToNextCycle);
  const backDestination = isCommitteeMember
    ? "/committee/dashboard"
    : isCycleRegistered
    ? "/shared/faculty-dashboard"
    : L03_ROUTE;
  const backTopLabel = isCycleRegistered
    ? "← Back to Dashboard"
    : "← Back to Cycle Registration";
  const backBottomLabel = isCycleRegistered
    ? "Return to Dashboard"
    : "Return to Cycle Registration";

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
    if (isCommitteeMember || currentUserId === null) return true;
    return (
      getNumericId(record.observer) === currentUserId ||
      getNumericId(record.observee) === currentUserId
    );
  });

  const matchesRoleFilter = (asObserver: boolean) => {
    if (roleFilter === "observer") return asObserver;
    if (roleFilter === "observee") return !asObserver;
    return true;
  };

  const allCurrentRecords = userRecords.filter(
    (record) => record.status !== "completed" && record.status !== "cancelled"
  );

  const allPastRecords = userRecords.filter(
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

  const allActiveScheduledVisits = normalizedVisits.filter((visit) => {
    if (existingRecordPairingIds.has(visit.pairingId)) return false;
    const visitKey = buildVisitKey(
      visit.observerId,
      visit.observeeId,
      visit.confirmedDatetime,
      visit.pairingId
    );
    if (existingRecordKeys.has(visitKey)) return false;
    if (visit.fromScheduledEndpoint) return true;
    if (isCommitteeMember || currentUserId === null) return true;
    return (
      visit.observerId === currentUserId || visit.observeeId === currentUserId
    );
  });

  const currentRecords = allCurrentRecords.filter((record) =>
    matchesRoleFilter(
      isUserObserver(getNumericId(record.observer), record.observer?.name)
    )
  );

  const activeScheduledVisits = allActiveScheduledVisits.filter((visit) =>
    matchesRoleFilter(isUserObserver(visit.observerId, visit.observerName))
  );

  const pastRecords = allPastRecords.filter((record) =>
    matchesRoleFilter(
      isUserObserver(getNumericId(record.observer), record.observer?.name)
    )
  );

  const totalActiveCount = isCycleRegistered
    ? allCurrentRecords.length + allActiveScheduledVisits.length
    : 0;

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
      <div className="back-dashboard-wrapper">
        <Link to={backDestination} className="back-dashboard-link">
          {backTopLabel}
        </Link>
      </div>

      {/* Header matching A03 to A08 */}
      <div className="committee-page-header">
        <h2>Current and Past Observations</h2>

        {!liveLoading && (
          <div className="committee-page-header-meta">
            <span className="a01-cycle-badge">
              {isCycleRegistered
                ? `${totalActiveCount} Active - ${allPastRecords.length} Archived`
                : `${allPastRecords.length} Archived`}
            </span>
          </div>
        )}
      </div>

      <section className="s04-reminders-card">
        <div className="s04-reminders-header">
          <div className="s03-section-title-group">
            <span className="a01-phase-pill">Schedule</span>
            <h3 className="s04-reminders-title">Cycle Deadlines</h3>
          </div>
        </div>

        <div className="s04-reminders-grid-3">
          <div className="s04-reminder-item">
            <span className="s04-reminder-label">
              Course Registration Cutoff
            </span>
            <p className="s04-reminder-date">
              {formatReminderDate(registration?.signup_deadline)}
            </p>
          </div>

          <div className="s04-reminder-item">
            <span className="s04-reminder-label">
              Classroom Visits and Signing
            </span>
            <p className="s04-reminder-date">
              {formatReminderDate(registration?.observation_deadline)}
            </p>
          </div>

          <div className="s04-reminder-item">
            <span className="s04-reminder-label">
              End-Of-Process Survey
            </span>
            <p className="s04-reminder-date">
              {formatReminderDate(registration?.survey_deadline)}
            </p>
          </div>
        </div>
      </section>

      {liveLoading && (
        <div className="a07-state-box">Loading observation records...</div>
      )}

      {liveError && (
        <div role="alert" className="empty-state-banner">
          {liveError}
        </div>
      )}

      {!liveLoading && !liveError && !isCommitteeMember && (
        <div className="s03-toolbar s04-zero-margin">
          <div className="s03-filter-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={roleFilter === "all"}
              className={`s03-filter-tab ${
                roleFilter === "all" ? "is-active" : ""
              }`}
              onClick={() => setRoleFilter("all")}
            >
              All Roles
              <span className="s03-tab-count">
                {totalActiveCount + allPastRecords.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={roleFilter === "observer"}
              className={`s03-filter-tab ${
                roleFilter === "observer" ? "is-active" : ""
              }`}
              onClick={() => setRoleFilter("observer")}
            >
              As Observer
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={roleFilter === "observee"}
              className={`s03-filter-tab ${
                roleFilter === "observee" ? "is-active" : ""
              }`}
              onClick={() => setRoleFilter("observee")}
            >
              As Observee
            </button>
          </div>
        </div>
      )}

      {!liveLoading && !liveError && isCycleRegistered && (
        <section className="s04-section-panel">
          <div className="s04-section-header">
            <div className="a01-phase-title-group">
              <span className="a01-phase-pill">Active</span>
              <h3>
                Ongoing Evaluations (
                {currentRecords.length + activeScheduledVisits.length})
              </h3>
            </div>
            <p className="s04-section-subtitle">
              Scheduled classroom visits and active evaluation forms
            </p>
          </div>

          {currentRecords.length === 0 && activeScheduledVisits.length === 0 ? (
            <div className="a07-state-box s04-zero-margin">
              {roleFilter === "all"
                ? "No current observations or confirmed peer pairings yet."
                : `No ongoing observations in the ${roleFilter} role.`}
            </div>
          ) : (
            <div className="s04-cards-grid">
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
                    className={`s04-event-card ${
                      asObserver ? "is-observer" : "is-observee"
                    }`}
                  >
                    <div>
                      <div className="s04-card-top-row">
                        <span
                          className={`pill-badge ${
                            asObserver ? "pill-observer" : "pill-observee"
                          }`}
                        >
                          {asObserver ? "Observer" : "Observee"}
                        </span>

                        <span className="version-pill">{visit.statusLabel}</span>
                      </div>

                      <h4 className="s04-card-title">{fullCourseHeader}</h4>

                      <div className="s04-meta-grid">
                        <div className="s04-meta-item">
                          <span className="s04-meta-label">
                            {asObserver ? "Observee" : "Observer"}
                          </span>
                          <span className="s04-meta-value">
                            {asObserver
                              ? visit.observeeName
                              : visit.observerName}
                          </span>
                        </div>

                        <div className="s04-meta-item">
                          <span className="s04-meta-label">Classroom</span>
                          <span className="s04-meta-value">
                            {visit.courseClassroom || "Not provided"}
                          </span>
                        </div>

                        <div className="s04-meta-item is-full">
                          <span className="s04-meta-label">Scheduled Visit</span>
                          <span className="s04-meta-value">
                            {formatObservationDate(visit.confirmedDatetime)}
                          </span>
                        </div>

                        {visit.courseSchedule && (
                          <div className="s04-meta-item is-full">
                            <span className="s04-meta-label">
                              Class Schedule
                            </span>
                            <span className="s04-meta-value">
                              {visit.courseSchedule}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="s04-card-note">
                      {visit.statusLabel !== AWAITING_CONFIRMATION ? (
                        "The evaluation form opens once the scheduled classroom visit takes place."
                      ) : asObserver ? (
                        "You accepted this date. The observee still has to confirm the visit."
                      ) : (
                        <>
                          This observer accepted.{" "}
                          <Link
                            to="/observee/observer-selection"
                            className="s04-inline-link"
                          >
                            Confirm the visit
                          </Link>{" "}
                          to schedule it.
                        </>
                      )}
                    </p>
                  </article>
                );
              })}

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
                    className={`s04-event-card ${
                      asObserver ? "is-observer" : "is-observee"
                    }`}
                  >
                    <div>
                      <div className="s04-card-top-row">
                        <span
                          className={`pill-badge ${
                            asObserver ? "pill-observer" : "pill-observee"
                          }`}
                        >
                          {asObserver ? "Observer" : "Observee"}
                        </span>

                        <span className="version-pill">
                          {statusLabel(record.status)}
                        </span>
                      </div>

                      <h4 className="s04-card-title">{fullCourseHeader}</h4>

                      <div className="s04-meta-grid">
                        <div className="s04-meta-item">
                          <span className="s04-meta-label">
                            {asObserver ? "Observee" : "Observer"}
                          </span>
                          <span className="s04-meta-value">
                            {asObserver
                              ? record.observee.name
                              : record.observer.name}
                          </span>
                        </div>

                        <div className="s04-meta-item">
                          <span className="s04-meta-label">Classroom</span>
                          <span className="s04-meta-value">
                            {record.course?.classroom || "Not provided"}
                          </span>
                        </div>

                        <div className="s04-meta-item is-full">
                          <span className="s04-meta-label">
                            Observation Date
                          </span>
                          <span className="s04-meta-value">
                            {formatObservationDate(record.confirmed_datetime)}
                          </span>
                        </div>

                        {record.course?.schedule && (
                          <div className="s04-meta-item is-full">
                            <span className="s04-meta-label">
                              Class Schedule
                            </span>
                            <span className="s04-meta-value">
                              {record.course.schedule}
                            </span>
                          </div>
                        )}

                        <div className="s04-signoff-pills">
                          <span
                            className={`s04-signoff-pill ${
                              record.observer_signed ? "is-complete" : ""
                            }`}
                          >
                            Observer:{" "}
                            {record.observer_signed ? "Signed" : "Pending"}
                          </span>
                          <span
                            className={`s04-signoff-pill ${
                              record.observee_signed ? "is-complete" : ""
                            }`}
                          >
                            Observee:{" "}
                            {record.observee_signed ? "Signed" : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="s04-card-actions">
                      <Link
                        to={`/shared/observation-record/${record.observation_id}`}
                        className="s04-pill-action is-primary"
                      >
                        Open Observation Record →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!liveLoading && !liveError && (
        <section className="s04-section-panel">
          <div className="s04-section-header">
            <div className="a01-phase-title-group">
              <span className="a01-phase-pill">Archive</span>
              <h3>Past Evaluations ({pastRecords.length})</h3>
            </div>
            <p className="s04-section-subtitle">
              Completed and cancelled observation records grouped by semester
            </p>
          </div>

          {pastRecords.length === 0 ? (
            <div className="a07-state-box s04-zero-margin">
              {roleFilter === "all"
                ? "No completed or cancelled observation records."
                : `No completed or cancelled observations in the ${roleFilter} role.`}
            </div>
          ) : (
            <div className="table-container accordion-wrapper s04-accordion-shell">
              {sortedSemesters.map((semester) => {
                const semesterRecords = pastRecordsBySemester[semester];
                return (
                  <div
                    className="accordion-item s04-accordion-item"
                    key={semester}
                  >
                    <div
                      className="accordion-header s04-accordion-trigger"
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
                      <div className="s04-accordion-left">
                        <span>{semester}</span>
                        <span className="version-pill">
                          {semesterRecords.length}{" "}
                          {semesterRecords.length === 1 ? "Record" : "Records"}
                        </span>
                      </div>
                      <span>{isOpen(semester) ? "▲" : "▼"}</span>
                    </div>

                    {isOpen(semester) && (
                      <div className="accordion-content">
                        <div className="s04-cards-grid">
                          {semesterRecords.map((record) => {
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
                                className={`s04-event-card ${
                                  asObserver ? "is-observer" : "is-observee"
                                }`}
                                key={record.observation_id}
                              >
                                <div>
                                  <div className="s04-card-top-row">
                                    <span
                                      className={`pill-badge ${
                                        asObserver
                                          ? "pill-observer"
                                          : "pill-observee"
                                      }`}
                                    >
                                      {asObserver ? "Observer" : "Observee"}
                                    </span>

                                    <span className="version-pill">
                                      {statusLabel(record.status)}
                                    </span>
                                  </div>

                                  <h4 className="s04-card-title">
                                    {courseHeader}
                                  </h4>

                                  <div className="s04-meta-grid">
                                    <div className="s04-meta-item">
                                      <span className="s04-meta-label">
                                        {asObserver ? "Observee" : "Observer"}
                                      </span>
                                      <span className="s04-meta-value">
                                        {asObserver
                                          ? record.observee.name
                                          : record.observer.name}
                                      </span>
                                    </div>

                                    <div className="s04-meta-item">
                                      <span className="s04-meta-label">
                                        Finalized
                                      </span>
                                      <span className="s04-meta-value">
                                        {record.observee_signed_at
                                          ? formatDateTime(
                                              record.observee_signed_at
                                            )
                                          : "Not finalized"}
                                      </span>
                                    </div>

                                    <div className="s04-meta-item is-full">
                                      <span className="s04-meta-label">
                                        Observation Date
                                      </span>
                                      <span className="s04-meta-value">
                                        {formatObservationDate(
                                          record.confirmed_datetime
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="s04-card-actions">
                                  <Link
                                    to={`/shared/observation-record/${record.observation_id}`}
                                    className="s04-pill-action is-primary"
                                  >
                                    View Record →
                                  </Link>

                                  {record.status === "completed" && (
                                    <Link
                                      to={`/shared/post-evaluation-survey?pairingId=${record.pairing_id}`}
                                      className="s04-pill-action is-survey"
                                    >
                                      Post-Evaluation Survey ↗
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
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="dashboard-center-action">
        <Link to={backDestination} className="btn-secondary">
          {backBottomLabel}
        </Link>
      </div>
    </div>
  );
}