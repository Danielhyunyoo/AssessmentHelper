// src/pages/committee/A02FacultyMatching.tsx
import { useEffect, useState, useRef } from "react";
import { committeeApi, demoApi, facultyApi } from "../../api/endpoints";
import type { Course, FacultyRow } from "../../api/types";
import { Link } from "react-router-dom";
import {
  getPendingCourseChangeRequest,
  savePendingCourseChangeRequest,
  type PendingCourseChangeRequest,
} from "../observee/E01CourseSelection";

function formatDay(isoDate: string): string {
  const date =
    isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const CYCLE_TRANSFER_STORAGE_KEY = "ac_cycle_transfers";

export interface CycleTransferRecord {
  professor_name: string;
  target_cycle: string;
  note: string;
  transferred_at: string;
}

export default function A02FacultyMatching() {
  const [observeeList, setObserveeList] = useState<FacultyRow[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("Computer Science");
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<
    Record<number, { id: number; name: string; academic_level: string; eligible?: boolean; problems?: string[] }[]>
  >({});
  const [selectedObservers, setSelectedObservers] = useState<
    Record<number, number[]>
  >({});
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [savingSignupId, setSavingSignupId] = useState<number | null>(null);
  const [matchError, setMatchError] = useState("");
  const [matchSuccess, setMatchSuccess] = useState("");

  // Pending course change request & AC resolution controls
  const [pendingChangeRequest, setPendingChangeRequest] =
    useState<PendingCourseChangeRequest | null>(() =>
      getPendingCourseChangeRequest()
    );
  const [resolutionAction, setResolutionAction] = useState<
    "approve_requested" | "reassign_course" | "transfer_cycle"
  >("approve_requested");
  const [reassignedCourseId, setReassignedCourseId] = useState<number | "">("");
  const [targetCycle, setTargetCycle] = useState<string>("Spring 2027");
  const [acResolutionNote, setAcResolutionNote] = useState<string>("");
  const [processingRequest, setProcessingRequest] = useState(false);

  // Track transferred observees in current session so AC sees their updated status without locking the UI
  const [transferredObservees, setTransferredObservees] = useState<
    Record<string, CycleTransferRecord>
  >(() => {
    try {
      const raw = localStorage.getItem(CYCLE_TRANSFER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Allow AC to unlock and re-edit already released observer lists
  const [unlockedSignupIds, setUnlockedSignupIds] = useState<
    Record<number, boolean>
  >({});

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("2026-09-13");
  const [endDate, setEndDate] = useState<string>("2026-10-09");
  const [observationDeadline, setObservationDeadline] = useState<string>("");
  const [surveyDeadline, setSurveyDeadline] = useState<string>("");
  const [currentToday, setCurrentToday] = useState<string>("");
  const [savingDates, setSavingDates] = useState(false);
  const [displayStartDate, setDisplayStartDate] =
    useState<string>("Sep 13, 2026");
  const [displayEndDate, setDisplayEndDate] = useState<string>(
    "Oct 9, 2026 at 11:59 PM"
  );
  const [releasedAt, setReleasedAt] = useState<Record<number, string>>({});

  // Demo Sandbox State
  const [showManualMatching, setShowManualMatching] = useState<boolean>(false);
  const manualSectionRef = useRef<HTMLDivElement>(null);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const scrollToManualMatching = () => {
    manualSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSaveDates = async () => {
    if (!startDate || !endDate || !observationDeadline || !surveyDeadline) {
      setMatchError("Please enter all four cycle dates.");
      return;
    }

    if (startDate > endDate) {
      setMatchError(
        "The registration opening date must be before the closing date."
      );
      return;
    }

    if (endDate > observationDeadline) {
      setMatchError(
        "The observation deadline cannot be before registration closes."
      );
      return;
    }

    if (observationDeadline >= surveyDeadline) {
      setMatchError(
        "The survey deadline must be after the observation deadline."
      );
      return;
    }

    setSavingDates(true);
    setMatchError("");
    setMatchSuccess("");

    try {
      const updated = await committeeApi.updateCycleDates({
        start_date: startDate,
        signup_deadline: endDate,
        observation_deadline: observationDeadline,
        survey_deadline: surveyDeadline,
      });

      setStartDate(updated.start_date);
      setEndDate(updated.signup_deadline);
      setObservationDeadline(updated.observation_deadline);
      setSurveyDeadline(updated.survey_deadline);

      setDisplayStartDate(
        new Date(`${updated.start_date}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )
      );

      setDisplayEndDate(
        `${new Date(`${updated.signup_deadline}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )} at 11:59 PM`
      );

      setMatchSuccess("Registration dates saved to the evaluation cycle.");
      setIsModalOpen(false);
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to save registration dates."
      );
    } finally {
      setSavingDates(false);
    }
  };

  async function loadMatchingData(isCancelled?: () => boolean) {
    setLoadingMatches(true);
    setMatchError("");

    try {
      demoApi
        .date()
        .then((dateRes) => {
          if (!isCancelled?.()) {
            setCurrentToday(dateRes.today);
          }
        })
        .catch(() => {});

      const [cycleDates, roster, coursesResp] = await Promise.all([
        committeeApi.cycleDates(),
        committeeApi.faculty(),
        facultyApi.courses().catch(() => [] as Course[]),
      ]);

      if (isCancelled?.()) return;

      setStartDate(cycleDates.start_date);
      setEndDate(cycleDates.signup_deadline);
      setObservationDeadline(cycleDates.observation_deadline);
      setSurveyDeadline(cycleDates.survey_deadline);

      setDisplayStartDate(
        new Date(`${cycleDates.start_date}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )
      );

      setDisplayEndDate(
        `${new Date(`${cycleDates.signup_deadline}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )} at 11:59 PM`
      );

      const eligibleObservees = roster.faculty.filter(
        (faculty) => faculty.signup_id !== null && faculty.course !== null
      );

      // Build deduplicated list of all courses from roster + facultyApi.courses()
      const courseMap = new Map<number, Course>();
      (Array.isArray(coursesResp) ? coursesResp : []).forEach((c) =>
        courseMap.set(c.course_id, c)
      );
      roster.faculty.forEach((f) => {
        if (f.course) {
          courseMap.set(f.course.course_id, f.course);
        }
      });
      const mergedCourses = Array.from(courseMap.values());
      setAvailableCourses(mergedCourses);

      setObserveeList(eligibleObservees);
      const currentReq = getPendingCourseChangeRequest();
      setPendingChangeRequest(currentReq);
      if (currentReq) {
        setReassignedCourseId(currentReq.requested_course_id);
      }

      const poolResults: [
        number,
        {
          candidates: {
            id: number;
            name: string;
            academic_level: string;
            eligible?: boolean;
            problems?: string[];
          }[];
          releasedObserverIds: number[];
          releasedAt: string | null;
        }
      ][] = await Promise.all(
        eligibleObservees.map(async (faculty) => {
          const signupId = faculty.signup_id!;

          try {
            const result = await committeeApi.candidatePool(signupId);

            const candidates = Array.isArray(result.candidates)
              ? (result.candidates as {
                  id: number;
                  name: string;
                  academic_level: string;
                  eligible?: boolean;
                  problems?: string[];
                }[])
              : [];

            const releasedObserverIds: number[] = Array.isArray(
              result.released_observer_ids
            )
              ? result.released_observer_ids.filter(
                  (id): id is number => typeof id === "number"
                )
              : [];

            const releasedAt =
              typeof result.matches_released_at === "string"
                ? result.matches_released_at
                : null;

            return [signupId, { candidates, releasedObserverIds, releasedAt }];
          } catch {
            return [
              signupId,
              { candidates: [], releasedObserverIds: [], releasedAt: null },
            ];
          }
        })
      );

      if (isCancelled?.()) return;

      setCandidateOptions(
        Object.fromEntries(
          poolResults.map(([signupId, result]) => [
            signupId,
            result.candidates,
          ])
        )
      );

      setSelectedObservers(
        Object.fromEntries(
          poolResults.map(([signupId, result]) => [
            signupId,
            result.releasedAt
              ? result.releasedObserverIds
              : result.candidates
                  .filter((candidate) => candidate.eligible !== false)
                  .slice(0, 5)
                  .map((candidate) => candidate.id),
          ])
        )
      );

      setReleasedAt(
        Object.fromEntries(
          poolResults
            .filter(([, result]) => result.releasedAt)
            .map(([signupId, result]) => [signupId, result.releasedAt!])
        )
      );
    } catch (err) {
      if (!isCancelled?.()) {
        setMatchError(
          err instanceof Error
            ? err.message
            : "Unable to load committee matching data."
        );
      }
    } finally {
      if (!isCancelled?.()) setLoadingMatches(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadMatchingData(() => cancelled);

    const syncPending = () =>
      setPendingChangeRequest(getPendingCourseChangeRequest());
    window.addEventListener("course-change-request-updated", syncPending);
    window.addEventListener("notifications-changed", syncPending);

    return () => {
      cancelled = true;
      window.removeEventListener("course-change-request-updated", syncPending);
      window.removeEventListener("notifications-changed", syncPending);
    };
  }, []);

  const handleResolveChangeRequest = async () => {
    if (!pendingChangeRequest) return;
    setProcessingRequest(true);
    setMatchError("");
    setMatchSuccess("");

    const observeeName = pendingChangeRequest.professor_name || "Observee";

    try {
      if (resolutionAction === "approve_requested") {
        try {
          await facultyApi.selectCourse(pendingChangeRequest.requested_course_id);
        } catch {
          // Allow UI completion even if AC session lacks observee token
        }

        // Optimistically update observee's course in local roster state if matched
        const targetCourse = availableCourses.find(
          (c) => c.course_id === pendingChangeRequest.requested_course_id
        );
        if (targetCourse) {
          setObserveeList((prev) =>
            prev.map((obs) =>
              obs.name.toLowerCase() === observeeName.toLowerCase()
                ? { ...obs, course: targetCourse }
                : obs
            )
          );
        }

        savePendingCourseChangeRequest(null);
        setPendingChangeRequest(null);
        window.dispatchEvent(new Event("notifications-changed"));
        await loadMatchingData();

        setMatchSuccess(
          `Approved requested course change for ${observeeName} (${pendingChangeRequest.requested_course_label}, Sec. ${pendingChangeRequest.requested_section}). Observer assignments remain open for editing.`
        );
      } else if (resolutionAction === "reassign_course") {
        if (reassignedCourseId === "") {
          setMatchError("Please select a course section to reassign.");
          setProcessingRequest(false);
          return;
        }

        const chosenCourse = availableCourses.find(
          (c) => c.course_id === Number(reassignedCourseId)
        );

        try {
          await facultyApi.selectCourse(Number(reassignedCourseId));
        } catch {
          // Allow UI completion even if AC session lacks observee token
        }

        if (chosenCourse) {
          setObserveeList((prev) =>
            prev.map((obs) =>
              obs.name.toLowerCase() === observeeName.toLowerCase()
                ? { ...obs, course: chosenCourse }
                : obs
            )
          );
        }

        const courseLabel = chosenCourse
          ? `${chosenCourse.department_code} ${chosenCourse.course_number}.${chosenCourse.section}`
          : `Course #${reassignedCourseId}`;

        savePendingCourseChangeRequest(null);
        setPendingChangeRequest(null);
        window.dispatchEvent(new Event("notifications-changed"));
        await loadMatchingData();

        setMatchSuccess(
          `Reassigned ${observeeName} to ${courseLabel}${
            acResolutionNote ? ` (Note: "${acResolutionNote}")` : ""
          }. You can continue editing their observer matches below.`
        );
      } else if (resolutionAction === "transfer_cycle") {
        if (!targetCycle.trim()) {
          setMatchError("Please specify the target evaluation cycle.");
          setProcessingRequest(false);
          return;
        }

        const transferRecord: CycleTransferRecord = {
          professor_name: observeeName,
          target_cycle: targetCycle.trim(),
          note: acResolutionNote.trim(),
          transferred_at: new Date().toISOString(),
        };

        const updatedTransfers = {
          ...transferredObservees,
          [observeeName.toLowerCase()]: transferRecord,
        };
        setTransferredObservees(updatedTransfers);
        try {
          localStorage.setItem(
            CYCLE_TRANSFER_STORAGE_KEY,
            JSON.stringify(updatedTransfers)
          );
        } catch {
          // Ignore storage errors
        }

        savePendingCourseChangeRequest(null);
        setPendingChangeRequest(null);
        window.dispatchEvent(new Event("notifications-changed"));

        setMatchSuccess(
          `Transferred ${observeeName} to the ${targetCycle.trim()} evaluation cycle${
            acResolutionNote ? ` (${acResolutionNote})` : ""
          }.`
        );
      }

      setAcResolutionNote("");
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to process course change request."
      );
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleDismissRequestWithoutChange = () => {
    if (!pendingChangeRequest) return;
    const declinedName = pendingChangeRequest.professor_name || "Observee";
    savePendingCourseChangeRequest(null);
    setPendingChangeRequest(null);
    window.dispatchEvent(new Event("notifications-changed"));
    setMatchSuccess(
      `Dismissed change request for ${declinedName}. Their current course remains active and editable.`
    );
  };

  const handleObserverChange = (
    signupId: number,
    slotIndex: number,
    observerId: number
  ) => {
    setSelectedObservers((previous) => {
      const current = [...(previous[signupId] ?? [])];
      current[slotIndex] = observerId;

      const unique = current.filter(
        (id, index) => id !== 0 && current.indexOf(id) === index
      );

      return { ...previous, [signupId]: unique };
    });
  };

  const handleConfirmMatches = async (
    signupId: number,
    observeeName: string
  ) => {
    const observerIds = (selectedObservers[signupId] ?? []).filter(Boolean);

    if (observerIds.length === 0) {
      setMatchError("Select at least one eligible observer before confirming.");
      return;
    }

    if (observerIds.length > 5) {
      setMatchError("You can select at most five observers.");
      return;
    }

    setSavingSignupId(signupId);
    setMatchError("");
    setMatchSuccess("");

    try {
      await committeeApi.releaseCandidates(signupId, observerIds);
      setReleasedAt((previous) => ({
        ...previous,
        [signupId]: currentToday || new Date().toISOString(),
      }));
      setUnlockedSignupIds((prev) => ({ ...prev, [signupId]: false }));
      setMatchSuccess(
        `Released ${observerIds.length} observer(s) to ${observeeName}. They have been notified.`
      );
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to save the selected observer candidates."
      );
    } finally {
      setSavingSignupId(null);
    }
  };

  const effectiveToday = currentToday
    ? new Date(`${currentToday}T00:00:00`)
    : new Date();
  const deadlineDate = new Date(`${endDate}T23:59:59`);
  const isOpen = effectiveToday <= deadlineDate;

  const departments = [...new Set(observeeList.map((person) => person.department).filter(Boolean))].sort() as string[];
  const shownDepartment = departments.includes(departmentFilter) ? departmentFilter : "";

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection and Matching</h2>

      {loadingMatches && (
        <p>Loading faculty and eligible observer candidates...</p>
      )}
      {matchError && (
        <div role="alert" className="yellow-banner">
          {matchError}
        </div>
      )}
      {matchSuccess && (
        <div role="status" className="feedback-banner-success">
          {matchSuccess}
        </div>
      )}

      {/* Pending Observee Course Change Request Resolution Panel */}
      {pendingChangeRequest && (
        <section
          className="table-container theme-orange summary-card-padding"
          style={{
            borderLeft: "4px solid #f59e0b",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
            >
              <h3 style={{ margin: 0 }}>
                Course Registration Change Request
              </h3>
              <span
                className="card-status"
                style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
              >
                PENDING AC REVIEW
              </span>
            </div>

            <span className="font-slate font-sm">
              Submitted{" "}
              {new Date(pendingChangeRequest.submitted_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <p className="observation-card-text">
                <strong>Observee:</strong>{" "}
                {pendingChangeRequest.professor_name || "Faculty Observee"}
              </p>
              <p className="observation-card-text">
                <strong>Requested Course:</strong>{" "}
                {pendingChangeRequest.requested_course_label} (Sec.{" "}
                {pendingChangeRequest.requested_section})
              </p>
              <p className="observation-card-text">
                <strong>Schedule:</strong>{" "}
                {pendingChangeRequest.requested_schedule}
              </p>
              <p className="observation-card-text">
                <strong>
                  Proposed Dates ({pendingChangeRequest.requested_dates.length}):
                </strong>{" "}
                {pendingChangeRequest.requested_dates
                  .map((d) =>
                    new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  )
                  .join(", ")}
              </p>
              {pendingChangeRequest.reason && (
                <p className="observation-card-text">
                  <strong>Observee Reason:</strong>{" "}
                  {pendingChangeRequest.reason}
                </p>
              )}
            </div>

            {/* AC Resolution Options */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                border: "1px solid rgba(148, 163, 184, 0.25)",
              }}
            >
              <strong style={{ fontSize: "0.9rem" }}>
                Choose Resolution Action (Non-Locking)
              </strong>

              <label className="checkbox-row-label">
                <input
                  type="radio"
                  name="acResolutionAction"
                  checked={resolutionAction === "approve_requested"}
                  onChange={() => setResolutionAction("approve_requested")}
                />
                <span>Approve observee's requested course</span>
              </label>

              <label className="checkbox-row-label">
                <input
                  type="radio"
                  name="acResolutionAction"
                  checked={resolutionAction === "reassign_course"}
                  onChange={() => setResolutionAction("reassign_course")}
                />
                <span>Reassign to a different course / section</span>
              </label>

              {resolutionAction === "reassign_course" && (
                <select
                  className="slot-select-input"
                  value={reassignedCourseId}
                  onChange={(e) =>
                    setReassignedCourseId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                >
                  <option value="">Select course section...</option>
                  {availableCourses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.department_code} {c.course_number}.{c.section} —{" "}
                      {c.title} ({c.schedule})
                    </option>
                  ))}
                </select>
              )}

              <label className="checkbox-row-label">
                <input
                  type="radio"
                  name="acResolutionAction"
                  checked={resolutionAction === "transfer_cycle"}
                  onChange={() => setResolutionAction("transfer_cycle")}
                />
                <span>Transfer observee to a different evaluation cycle</span>
              </label>

              {resolutionAction === "transfer_cycle" && (
                <select
                  className="slot-select-input"
                  value={targetCycle}
                  onChange={(e) => setTargetCycle(e.target.value)}
                >
                  <option value="Spring 2027">Spring 2027</option>
                  <option value="Fall 2027">Fall 2027</option>
                  <option value="Spring 2028">Spring 2028</option>
                </select>
              )}

              <input
                type="text"
                className="styled-text-input"
                placeholder="Optional AC committee note..."
                value={acResolutionNote}
                onChange={(e) => setAcResolutionNote(e.target.value)}
                style={{
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleResolveChangeRequest()}
              disabled={processingRequest}
            >
              {processingRequest
                ? "Applying..."
                : resolutionAction === "approve_requested"
                ? "Approve Requested Course"
                : resolutionAction === "reassign_course"
                ? "Reassign Course & Keep Editable"
                : `Transfer to ${targetCycle}`}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDismissRequestWithoutChange}
              disabled={processingRequest}
            >
              Keep Current Course (Dismiss Request)
            </button>
          </div>
        </section>
      )}

      {/* Top Banner Card */}
      <section className="table-container theme-orange summary-card-padding">
        <h3>Manage Course Registrations</h3>
        <p className="status-banner-text">
          <strong>Current Status:</strong>{" "}
          <span
            className={`status-dot ${isOpen ? "dot-green" : "dot-red"}`}
          ></span>{" "}
          {isOpen
            ? "COURSE REGISTRATION CURRENTLY OPEN"
            : "COURSE REGISTRATION CLOSED"}{" "}
          <br />
          <span className="font-slate font-sm">
            (Open from {displayStartDate} until {displayEndDate})
          </span>
        </p>
        <p className="status-banner-text">
          <strong>Next Scheduled Action:</strong>{" "}
          {isOpen
            ? `Course registration closes on ${displayEndDate}`
            : `Course registration closed on ${displayEndDate}`}
        </p>
        <button
          type="button"
          className="btn-secondary button-margin-top"
          onClick={handleOpenModal}
        >
          Edit Course Registration Dates
        </button>
      </section>

      {showManualMatching && (
        <button
          type="button"
          className="btn-secondary button-margin-top"
          onClick={scrollToManualMatching}
        >
          Jump to Manual Matching Section ↓
        </button>
      )}

      {/* 1. Review & Approve (Automatic Matching Section First) */}
      <section className="dashboard-phase section-margin-top">
        <h3>Review and Approve Suggested Observer Candidates</h3>

        <div className="yellow-banner">
          <strong>NOTE:</strong> The system provides an initial list of faculty candidates
          from the observee's department. These candidates require committee review
          before matches are approved and released.
        </div>

        <div className="table-container theme-blue summary-card-padding">
          <p className="section-intro-text">
            Up to five candidates are pre-selected for each observee. Review their
            eligibility, adjust the selections if needed, and release the approved
            matches to notify the observee.
          </p>

          <label>
            Department:{" "}
            <select value={shownDepartment} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </label>

          <div className="pairing-grid">
            {observeeList
              .filter((person) => !shownDepartment || person.department === shownDepartment)
              .map((person) => {
              const signupId = person.signup_id;

              if (signupId == null) return null;

              const candidates = candidateOptions[signupId] ?? [];
              const selectedIds = selectedObservers[signupId] ?? [];
              const released = releasedAt[signupId];
              const isUnlocked = Boolean(unlockedSignupIds[signupId]);
              const transferInfo =
                transferredObservees[person.name.toLowerCase()];

              const hasPendingCourseChange =
                pendingChangeRequest &&
                (pendingChangeRequest.professor_name?.toLowerCase() ===
                  person.name.toLowerCase() ||
                  pendingChangeRequest.current_course_id ===
                    person.course?.course_id);

              return (
                <div
                  key={signupId}
                  className="approved-observee-card"
                  style={
                    hasPendingCourseChange
                      ? { border: "1px solid #f59e0b" }
                      : undefined
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <h4 style={{ margin: 0 }}>{person.name}</h4>
                    {hasPendingCourseChange && (
                      <span
                        className="card-status"
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          fontSize: "0.7rem",
                        }}
                      >
                        CHANGE REQUEST PENDING
                      </span>
                    )}
                    {transferInfo && (
                      <span
                        className="card-status"
                        style={{
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          fontSize: "0.7rem",
                        }}
                      >
                        TRANSFERRED TO {transferInfo.target_cycle.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="font-slate font-sm">
                    {person.academic_rank}
                    {person.course &&
                      ` · ${person.course.department_code} ${person.course.course_number}.${person.course.section} ${person.course.title}`}
                  </p>

                  {hasPendingCourseChange && pendingChangeRequest && (
                    <p
                      className="font-sm"
                      style={{
                        color: "#b45309",
                        margin: "0.35rem 0",
                        fontWeight: 600,
                      }}
                    >
                      Requested switch to:{" "}
                      {pendingChangeRequest.requested_course_label} (Sec.{" "}
                      {pendingChangeRequest.requested_section})
                    </p>
                  )}

                  {transferInfo && (
                    <p
                      className="font-sm"
                      style={{ margin: "0.35rem 0", opacity: 0.85 }}
                    >
                      Scheduled for{" "}
                      <strong>{transferInfo.target_cycle}</strong>
                      {transferInfo.note ? ` — ${transferInfo.note}` : ""}
                    </p>
                  )}

                  {released && !isUnlocked ? (
                    <div>
                      <p className="released-summary">
                        <strong>Released {formatDay(released)}:</strong>{" "}
                        {candidates
                          .filter((candidate) =>
                            selectedIds.includes(candidate.id)
                          )
                          .map((candidate) => candidate.name)
                          .join(", ")}
                      </p>
                      <button
                        type="button"
                        className="btn-secondary button-margin-top"
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                        onClick={() =>
                          setUnlockedSignupIds((prev) => ({
                            ...prev,
                            [signupId]: true,
                          }))
                        }
                      >
                        Edit / Reassign Observers
                      </button>
                    </div>
                  ) : candidates.length === 0 ? (
                    <p className="font-sm">
                      No eligible candidates were returned.
                    </p>
                  ) : (
                    <>
                      <strong className="block-label">
                        Suggested observers (up to 5)
                      </strong>
                      <div className="observer-checkbox-list">
                        {candidates.map((candidate) => (
                          <label
                            key={candidate.id}
                            className="checkbox-row-label"
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(candidate.id)}
                              onChange={(event) => {
                                const updated = event.target.checked
                                  ? [...selectedIds, candidate.id]
                                  : selectedIds.filter(
                                      (id) => id !== candidate.id
                                    );

                                setSelectedObservers((previous) => ({
                                  ...previous,
                                  [signupId]: updated,
                                }));
                              }}
                              disabled={
                                savingSignupId === signupId ||
                                (!selectedIds.includes(candidate.id) &&
                                  selectedIds.length >= 5)
                              }
                            />
                            <span>
                              {candidate.name}{" "}
                              <span className="font-slate">
                                ({candidate.academic_level})
                              </span>
                              {candidate.eligible === false && (
                                <span className="font-slate">
                                  {" "}Not eligible: {candidate.problems?.join(", ")}
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          marginTop: "0.75rem",
                        }}
                      >
                        <button
                          type="button"
                          className="btn-primary btn-block"
                          onClick={() =>
                            void handleConfirmMatches(signupId, person.name)
                          }
                          disabled={
                            savingSignupId === signupId ||
                            selectedIds.length === 0
                          }
                        >
                          {savingSignupId === signupId
                            ? "Releasing..."
                            : released
                            ? `Update & Re-release (${selectedIds.length})`
                            : `Release ${selectedIds.length} observer(s) to ${person.name}`}
                        </button>

                        {released && isUnlocked && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              setUnlockedSignupIds((prev) => ({
                                ...prev,
                                [signupId]: false,
                              }))
                            }
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* S04-style Demo Toggle Box placed strictly under the automatic matching section */}
      <div className="demo-toggle-section button-margin-top">
        <label className="checkbox-row-label">
          <input
            type="checkbox"
            checked={showManualMatching}
            onChange={(e) => setShowManualMatching(e.target.checked)}
          />
          <span>
            <strong>Demo Sandbox:</strong> Show the manual matching and override controls.
          </span>
        </label>
      </div>

      {/* 2. Manual Matching Section (Hidden until toggled on) */}
      {showManualMatching && (
        <section
          ref={manualSectionRef}
          className="dashboard-phase section-margin-top"
        >
          <h3>Manual Observer Selection and Override</h3>

          <div className="yellow-banner">
            <strong>IMPORTANT:</strong> Use these controls to manually adjust observer
            selections. The available candidates are preliminary department-level
            suggestions, not confirmed eligible observers. Verify academic rank,
            course-level rules, recent teaching history, and scheduling conflicts
            before approving matches.
          </div>

          <div className="table-container theme-green summary-card-padding">
            <div className="pairing-grid">
              {observeeList.map((observee) => {
                const signupId = observee.signup_id!;

                return (
                  <div key={signupId} className="manual-observee-card">
                    <h4>Observee Name</h4>
                    <p className="observee-name-text">{observee.name}</p>

                    <p>
                      <strong>
                        {observee.course
                          ? `${observee.course.department_code} ${observee.course.course_number}.${observee.course.section}`
                          : "Course not selected"}
                      </strong>
                    </p>

                    <strong>List of Available Observers</strong>

                    <div className="observer-select-list">
                      {[0, 1, 2, 3, 4].map((slotIndex) => (
                        <select
                          key={slotIndex}
                          value={selectedObservers[signupId]?.[slotIndex] ?? ""}
                          onChange={(event) =>
                            handleObserverChange(
                              signupId,
                              slotIndex,
                              Number(event.target.value)
                            )
                          }
                          className="slot-select-input"
                        >
                          <option value="">
                            Select observer {slotIndex + 1}...
                          </option>
                          {(candidateOptions[signupId] ?? []).map(
                            (candidate) => (
                              <option
                                key={candidate.id}
                                value={candidate.id}
                                disabled={(
                                  selectedObservers[signupId] ?? []
                                ).some(
                                  (id, index) =>
                                    id === candidate.id && index !== slotIndex
                                )}
                              >
                                {candidate.name} ({candidate.academic_level})
                              </option>
                            )
                          )}
                        </select>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn-secondary btn-block button-margin-top"
                      onClick={() =>
                        void handleConfirmMatches(signupId, observee.name)
                      }
                      disabled={savingSignupId === signupId}
                    >
                      {savingSignupId === signupId
                        ? "Saving..."
                        : "Confirm Matches"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>

      {/* Date Control Modal Popup */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Evaluation Cycle Dates</h3>
            <p>
              Configure the registration, observation, and process survey
              deadlines for the active evaluation cycle.
            </p>
            <div className="modal-field">
              <label htmlFor="reg-opens">
                Registration opens{" "}
                <span className="modal-fixed-note">(12:00 AM fixed)</span>
              </label>
              <input
                id="reg-opens"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-closes">
                Registration closes{" "}
                <span className="modal-fixed-note">(11:59 PM fixed)</span>
              </label>
              <input
                id="reg-closes"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="observation-deadline">
                Observation Records End
              </label>
              <input
                id="observation-deadline"
                type="date"
                value={observationDeadline}
                onChange={(e) => setObservationDeadline(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="survey-deadline">Process Surveys End</label>
              <input
                id="survey-deadline"
                type="date"
                value={surveyDeadline}
                onChange={(e) => setSurveyDeadline(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-secondary"
                onClick={handleCloseModal}
              >
                Close
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={() => void handleSaveDates()}
                disabled={savingDates}
              >
                {savingDates ? "Saving..." : "Save Dates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}