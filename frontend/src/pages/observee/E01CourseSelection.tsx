// src/pages/observee/E01CourseSelection.tsx
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { facultyApi, matchingApi } from "../../api/endpoints";
import type { Course, RegistrationStatus } from "../../api/types";
import Calendar, { DayOfWeek } from "../../components/Calendar";
import { formatDate } from "../../api/format";

export interface PendingCourseChangeRequest {
  professor_id?: number;
  professor_name?: string;
  current_course_id: number | "";
  requested_course_id: number;
  requested_course_label: string;
  requested_section: string;
  requested_schedule: string;
  requested_dates: string[];
  reason: string;
  trigger_reason: "deadline_passed" | "observers_matched" | "both";
  submitted_at: string;
  status: "pending";
}

export const COURSE_CHANGE_REQUEST_KEY = "pending_course_change_request";

export function getPendingCourseChangeRequest(): PendingCourseChangeRequest | null {
  try {
    const raw = localStorage.getItem(COURSE_CHANGE_REQUEST_KEY);
    return raw ? (JSON.parse(raw) as PendingCourseChangeRequest) : null;
  } catch {
    return null;
  }
}

export function savePendingCourseChangeRequest(
  req: PendingCourseChangeRequest | null
) {
  try {
    if (req) {
      localStorage.setItem(COURSE_CHANGE_REQUEST_KEY, JSON.stringify(req));
    } else {
      localStorage.removeItem(COURSE_CHANGE_REQUEST_KEY);
    }
    window.dispatchEvent(new Event("course-change-request-updated"));
  } catch {
    // Ignore storage errors
  }
}

function extractCourseStartTime(schedule: string): string {
  const match = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]/i);

  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59) return "";

  if (meridiem) {
    if (hours < 1 || hours > 12) return "";
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (meridiem === "PM" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const WEEKDAYS: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function firstClassDay(fromIsoDate: string, days: string[]): Date {
  const date = new Date(`${fromIsoDate}T00:00:00`);
  for (let i = 0; i < 7 && !days.includes(WEEKDAYS[date.getDay()]); i++) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return localDateString(date.toISOString());
}

function localDateString(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function courseName(course: Course) {
  return `${course.department_code} ${course.course_number}${
    course.title ? ` - ${course.title}` : ""
  }`;
}

function parseAllowedDays(scheduleText: string): DayOfWeek[] {
  const upper = scheduleText.toUpperCase();
  const days: DayOfWeek[] = [];

  if (upper.includes("MWF")) return ["Mon", "Wed", "Fri"];
  if (upper.includes("MW")) return ["Mon", "Wed"];
  if (upper.includes("TR")) return ["Tue", "Thu"];
  if (upper.includes("TTH") || upper.includes("TU")) return ["Tue", "Thu"];
  if (upper.includes("M")) days.push("Mon");
  if (upper.includes("TU") || (upper.includes("T") && !upper.includes("TH")))
    days.push("Tue");
  if (upper.includes("W")) days.push("Wed");
  if (upper.includes("TH")) days.push("Thu");
  if (upper.includes("F")) days.push("Fri");

  return days.length > 0 ? days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
}

export default function E01CourseSelection() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(
    null
  );
  const [professorName, setProfessorName] = useState("");
  const [hasMatchedObservers, setHasMatchedObservers] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [confirmedCourseId, setConfirmedCourseId] = useState<number | "">("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendarSection, setShowCalendarSection] =
    useState<boolean>(false);

  const [pendingRequest, setPendingRequest] =
    useState<PendingCourseChangeRequest | null>(() =>
      getPendingCourseChangeRequest()
    );
  const [changeReason, setChangeReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [success, setSuccess] = useState("");
  const [datesSaved, setDatesSaved] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadPage() {
    setLoading(true);

    try {
      const [courseData, statusData, profileData, matchesData] =
        await Promise.all([
          facultyApi.courses(),
          facultyApi.registrationStatus(),
          facultyApi.profile().catch(() => null),
          matchingApi.matches().catch(() => null),
        ]);

      setCourses(courseData);
      setRegistration(statusData);

      if (profileData?.professor) {
        setProfessorName(
          `${profileData.professor.first_name} ${profileData.professor.last_name}`.trim()
        );
      }

      const observersReleased = Boolean(
        matchesData?.released ||
          (matchesData?.candidates && matchesData.candidates.length > 0)
      );
      setHasMatchedObservers(observersReleased);

      if (statusData.is_registered && statusData.has_selected_course) {
        try {
          const savedAvailability = await facultyApi.availability();
          const savedDateTimes = savedAvailability.available_datetimes ?? [];
          setSelectedDates(savedDateTimes.map(localDateString).filter(Boolean));
        } catch {
          setSelectedDates([]);
        }
      }

      const savedId = statusData.selected_course_id ?? "";
      setSelectedCourseId(savedId);
      setConfirmedCourseId(savedId);
      setShowCalendarSection(savedId !== "");
      setPendingRequest(getPendingCourseChangeRequest());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to load registration information.";
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const isPastRegistrationDeadline = Boolean(
    registration?.today &&
      registration?.signup_deadline &&
      registration.today > registration.signup_deadline
  );

  const requiresApprovalForChanges =
    Boolean(registration?.is_registered) &&
    (isPastRegistrationDeadline || hasMatchedObservers);

  const tomorrowIsoDate = registration ? nextDay(registration.today) : "";

  const earliestAllowedDate =
    registration?.start_date && registration.start_date > tomorrowIsoDate
      ? registration.start_date
      : tomorrowIsoDate;

  const confirmedCourse = courses.find(
    (c) => c.course_id === confirmedCourseId
  );
  const allowedDays = confirmedCourse
    ? parseAllowedDays(confirmedCourse.schedule)
    : ["Mon", "Wed", "Thu"];
  const calendarStart =
    selectedDates.length > 0
      ? new Date(`${[...selectedDates].sort()[0]}T00:00:00`)
      : firstClassDay(earliestAllowedDate, allowedDays);

  const handleConfirmClass = async () => {
    if (selectedCourseId === "") {
      window.alert("Please select a course section first.");
      return;
    }

    if (requiresApprovalForChanges) {
      setConfirmedCourseId(selectedCourseId);
      if (selectedCourseId !== registration?.selected_course_id) {
        setSelectedDates([]);
      }
      setShowCalendarSection(true);
      setSuccess(
        hasMatchedObservers
          ? "Matched observers have already been released for your registration. Review your proposed dates below and submit a change request for Assessment Committee approval."
          : "Registration deadline has passed. Choose your proposed observation dates below and submit a change request for Assessment Committee approval."
      );
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }

    setSaving(true);
    setSuccess("");

    try {
      if (!registration?.is_registered) {
        await facultyApi.register();
      }

      await facultyApi.selectCourse(Number(selectedCourseId));
      window.dispatchEvent(new Event("notifications-changed"));
      setConfirmedCourseId(selectedCourseId);

      if (selectedCourseId !== confirmedCourseId) {
        setSelectedDates([]);
        try {
          await facultyApi.saveAvailability([]);
        } catch {
          // Silent catch
        }
      }

      const [updatedStatus, updatedCourses] = await Promise.all([
        facultyApi.registrationStatus(),
        facultyApi.courses(),
      ]);

      setRegistration(updatedStatus);
      setCourses(updatedCourses);
      setShowCalendarSection(true);
      setSuccess(
        "Course section saved! Please select your observation dates below."
      );
      setDatesSaved(false);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to confirm course selection.";
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleScrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDateSelectionChange = (newDates: string[]) => {
    if (newDates.length > 8) {
      const msg = "You can only select up to 8 dates.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }
    setCalendarError("");
    setSelectedDates(newDates);
  };

  async function handleFinalSave() {
    if (confirmedCourseId === "") {
      const msg = "Please select a course section first.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    if (selectedDates.length < 4) {
      const msg = "Please select at least four observation dates.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    if (selectedDates.length > 8) {
      const msg = "You can select at most eight observation dates.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    if (!confirmedCourse) {
      const msg =
        "Please confirm a course section before selecting observation dates.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    const courseStartTime = extractCourseStartTime(confirmedCourse.schedule);

    if (!courseStartTime) {
      const msg =
        "The selected course's meeting time could not be determined. Please contact the team to check the course schedule.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    if (requiresApprovalForChanges) {
      const triggerReason =
        isPastRegistrationDeadline && hasMatchedObservers
          ? "both"
          : hasMatchedObservers
          ? "observers_matched"
          : "deadline_passed";

      const requestPayload: PendingCourseChangeRequest = {
        professor_name: professorName || "Faculty Observee",
        current_course_id: registration?.selected_course_id ?? "",
        requested_course_id: confirmedCourse.course_id,
        requested_course_label: courseName(confirmedCourse),
        requested_section: confirmedCourse.section,
        requested_schedule: confirmedCourse.schedule,
        requested_dates: [...selectedDates].sort(),
        reason: changeReason.trim(),
        trigger_reason: triggerReason,
        submitted_at: new Date().toISOString(),
        status: "pending",
      };

      savePendingCourseChangeRequest(requestPayload);
      setPendingRequest(requestPayload);
      setSuccess(
        "Your course and availability change request has been submitted and is pending Assessment Committee approval."
      );
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSaving(true);
    setCalendarError("");
    setSuccess("");

    try {
      const proposedDateTimes = selectedDates.map((date) => {
        const localDateTime = new Date(`${date}T${courseStartTime}:00`);

        if (Number.isNaN(localDateTime.getTime())) {
          throw new Error(
            `Invalid date or course time: ${date} ${courseStartTime}`
          );
        }

        return localDateTime.toISOString();
      });

      await facultyApi.saveAvailability(proposedDateTimes);
      window.dispatchEvent(new Event("notifications-changed"));

      setSuccess(
        `Your course and ${proposedDateTimes.length} proposed observation date and time choices were saved.`
      );
      setDatesSaved(true);

      navigate("/observee/observer-selection");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to save your observation dates.";
      setCalendarError(msg);
      window.alert(msg);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  const handleWithdrawRequest = () => {
    savePendingCourseChangeRequest(null);
    setPendingRequest(null);
    setChangeReason("");
    const activeId = registration?.selected_course_id ?? "";
    setSelectedCourseId(activeId);
    setConfirmedCourseId(activeId);
    setSuccess("Pending course change request withdrawn.");
  };

  const savedCourse = courses.find(
    (course) => course.course_id === registration?.selected_course_id
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">
          Loading your registration and course sections...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" ref={topRef}>
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Standardized Page Header */}
      <div className="committee-page-header">
        <div className="committee-page-title-block">
          <span className="a01-phase-pill">Observee Workflow: Step 1</span>
          <div className="committee-page-title-row">
            <h2>Course and Section Selection</h2>
          </div>
        </div>

        <div className="committee-page-header-meta">
          {registration?.cycle_name && (
            <span className="status-chip chip-draft">
              CYCLE: {registration.cycle_name.toUpperCase()}
            </span>
          )}
          {registration?.signup_deadline && (
            <span className="status-chip a02-chip-warning">
              DEADLINE: {formatDate(registration.signup_deadline).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {success && (
        <div role="status" className="feedback-banner-success">
          <strong>Success:</strong> {success}
          {datesSaved && (
            <p className="banner-followup-note">
              Click <Link to="/observee/observer-selection">here</Link> to
              continue to Observer Selection.
            </p>
          )}
        </div>
      )}

      {pendingRequest && (
        <section className="e01-pending-card">
          <div className="e01-pending-header">
            <div className="e01-pending-title-group">
              <h3 className="e01-pending-title">
                Pending Course Change Request
              </h3>
              <span className="e01-pending-pill">PENDING AC APPROVAL</span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleWithdrawRequest}
            >
              Withdraw Request
            </button>
          </div>

          <div className="form-summary-grid-4">
            <div className="form-summary-cell">
              <span className="summary-field-label">Requested Course</span>
              <p className="summary-field-val">
                {pendingRequest.requested_course_label} (Section{" "}
                {pendingRequest.requested_section})
              </p>
            </div>

            <div className="form-summary-cell">
              <span className="summary-field-label">Schedule</span>
              <p className="summary-field-val">
                {pendingRequest.requested_schedule}
              </p>
            </div>

            <div className="form-summary-cell">
              <span className="summary-field-label">
                Proposed Dates ({pendingRequest.requested_dates.length})
              </span>
              <p className="summary-field-val">
                {pendingRequest.requested_dates
                  .map((d) =>
                    new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  )
                  .join(", ")}
              </p>
            </div>

            <div className="form-summary-cell">
              <span className="summary-field-label">Reason</span>
              <p className="summary-field-val">
                {pendingRequest.reason || "No reason provided"}
              </p>
            </div>
          </div>

          <p className="e01-pending-footnote">
            Your current registered course remains active until an Assessment
            Committee member approves this request.
          </p>
        </section>
      )}

      {savedCourse && (
        <section className="e01-active-course-card">
          <div className="e02-card-header">
            <div>
              <h3 className="e02-card-title">
                Your Active Registered Course
                {pendingRequest ? " (Current)" : ""}
              </h3>
              <p className="e02-card-subtitle">
                Registered for the {registration?.cycle_name || "current"}{" "}
                observation cycle.
              </p>
            </div>
            <span className="status-pill-active">Registered</span>
          </div>

          <div className="e01-unified-course-block">
            <div className="e01-unified-primary-row">
              <span className="e01-unified-course-title">
                {courseName(savedCourse)}
              </span>
              <span className="e01-unified-section-pill">
                Section {savedCourse.section}
              </span>
            </div>
            <div className="e01-unified-meta-row">
              <span>
                <strong>Schedule:</strong> {savedCourse.schedule}
              </span>
              <span className="e01-unified-dot" aria-hidden="true">
                •
              </span>
              <span>
                <strong>Classroom:</strong>{" "}
                {savedCourse.classroom || "Not provided"}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Course Directory</span>
          <h3>
            {requiresApprovalForChanges
              ? "Request a Course Section Change"
              : "Select a Course Section"}
          </h3>
        </div>

        <div className="e02-callout-notice">
          {requiresApprovalForChanges ? (
            <>
              <strong>Approval Required for Changes:</strong>{" "}
              {hasMatchedObservers && isPastRegistrationDeadline
                ? "The standard signup deadline has passed and matched observers have already been assigned to your registration."
                : hasMatchedObservers
                ? "Matched observers have already been released by the Assessment Committee for your current registration."
                : `The standard signup deadline (${
                    registration ? formatDate(registration.signup_deadline) : ""
                  }) has passed.`}{" "}
              You can still view all sections and propose updates below, but any
              changes will remain <strong>pending</strong> until approved by an
              Assessment Committee member.
            </>
          ) : (
            <>
              <strong>Registration Window:</strong> Course registration closes{" "}
              {registration && formatDate(registration.signup_deadline)} at
              11:59 PM. Select and register 1 active course section below.
            </>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="empty-state-banner">
            No current course sections were returned for your account. Ask the
            team to check the demo account's course assignments.
          </div>
        ) : (
          <div className="table-container theme-green">
            <div className="table-scroll-wrapper">
              <table className="custom-data-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">Select</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Meeting Times</th>
                    <th>Classroom</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const isSelected = selectedCourseId === course.course_id;
                    const isCurrentActive =
                      registration?.selected_course_id === course.course_id;
                    return (
                      <tr
                        key={course.course_id}
                        className={isSelected ? "e01-selected-row" : undefined}
                        onClick={() => {
                          if (!saving) setSelectedCourseId(course.course_id);
                        }}
                      >
                        <td className="align-center">
                          <input
                            type="radio"
                            name="course"
                            value={course.course_id}
                            checked={isSelected}
                            onChange={() =>
                              setSelectedCourseId(course.course_id)
                            }
                            disabled={saving}
                            aria-label={`Select ${courseName(
                              course
                            )}, section ${course.section}`}
                          />
                        </td>
                        <td>
                          <div className="e01-course-name-cell">
                            <span className="e02-observer-name">
                              {courseName(course)}
                            </span>
                            {isCurrentActive && (
                              <span className="e01-current-tag">Current</span>
                            )}
                          </div>
                        </td>
                        <td>{course.section}</td>
                        <td>{course.schedule}</td>
                        <td>{course.classroom || "Not provided"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="e01-actions-end">
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmClass}
            disabled={saving || courses.length === 0 || selectedCourseId === ""}
          >
            {saving
              ? "Saving..."
              : requiresApprovalForChanges
              ? "Select Dates for Change Request"
              : "Confirm Class and Select Observation Date"}
          </button>
        </div>
      </section>

      {showCalendarSection && confirmedCourse && (
        <section ref={bottomRef} className="dashboard-phase phase-spacing">
          <div className="a01-phase-title-group">
            <span className="a01-phase-pill">Availability Window</span>
            <h3>
              {requiresApprovalForChanges
                ? "Select Proposed Observation Dates for Change Request"
                : "Select Proposed Observation Dates"}
            </h3>
          </div>

          <div className="e02-callout-notice">
            <strong>Scheduling Window:</strong> Please make sure all proposed
            observation dates fall on or before{" "}
            {registration && formatDate(registration.observation_deadline)}.
            Select 4 to 8 dates.
          </div>

          {calendarError && (
            <p role="alert" className="observer-validation-error">
              {calendarError}
            </p>
          )}

          <div className="e01-calendar-card">
            <div className="e01-calendar-grid">
              <div className="e01-preview-col">
                <div className="e01-preview-header">
                  <h4 className="e01-preview-heading">
                    {requiresApprovalForChanges
                      ? "Requested Course Change Preview"
                      : "Your Registered Course Preview"}
                  </h4>
                  <span
                    className={`e02-date-count-tag ${
                      selectedDates.length >= 4 && selectedDates.length <= 8
                        ? "is-valid"
                        : "is-warning"
                    }`}
                  >
                    {selectedDates.length} / 8 dates selected
                  </span>
                </div>

                  <div className="e01-unified-course-block is-compact">
                  <div className="e01-unified-primary-row">
                    <span className="e01-unified-course-title">
                      {courseName(confirmedCourse)}
                    </span>
                    <span className="e01-unified-section-pill">
                      Sec {confirmedCourse.section}
                    </span>
                  </div>
                  <div className="e01-unified-meta-row">
                    <span>
                      <strong>Time:</strong> {confirmedCourse.schedule}
                    </span>
                    <span className="e01-unified-dot" aria-hidden="true">
                      •
                    </span>
                    <span>
                      <strong>Room:</strong>{" "}
                      {confirmedCourse.classroom || "Not provided"}
                    </span>
                  </div>
                </div>

                {requiresApprovalForChanges && (
                  <div className="e01-reason-field">
                    <label
                      htmlFor="changeReasonInput"
                      className="e01-reason-label"
                    >
                      Reason for Course Change (Optional)
                    </label>
                    <input
                      id="changeReasonInput"
                      type="text"
                      className="styled-text-input"
                      placeholder="e.g., Section time conflict or teaching reassignment"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                    />
                  </div>
                )}

                <div className="e01-selected-dates-box">
                  <div className="e01-selected-dates-head">
                    <span className="summary-field-label">
                      Chosen Dates (Minimum 4 Required)
                    </span>
                    {selectedDates.length > 0 && (
                      <button
                        type="button"
                        className="signin-toggle-pw"
                        onClick={() => setSelectedDates([])}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {selectedDates.length === 0 ? (
                    <p className="font-slate font-sm">
                      Click eligible class meeting days on the calendar to add
                      them.
                    </p>
                  ) : (
                    <div className="e01-date-pills">
                      {[...selectedDates].sort().map((dateStr, idx) => {
                        const formatted = new Date(
                          `${dateStr}T00:00:00`
                        ).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <span key={idx} className="e02-saved-date-chip">
                            {formatted}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="e01-calendar-widget-col">
                <Calendar
                  selectedDates={selectedDates}
                  onDateSelectionChange={handleDateSelectionChange}
                  allowedDaysOfWeek={allowedDays as DayOfWeek[]}
                  maxSelections={8}
                  minDate={earliestAllowedDate}
                  maxDate={registration?.observation_deadline}
                  initialMonth={calendarStart.getMonth()}
                  initialYear={calendarStart.getFullYear()}
                />
              </div>
            </div>
          </div>

          <div className="e01-actions-between">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleScrollToTop}
            >
              Select a Different Course or Section
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleFinalSave}
              disabled={saving || selectedDates.length < 4}
            >
              {saving
                ? "Saving..."
                : requiresApprovalForChanges
                ? "Submit Course Change Request"
                : "Confirm Selected Dates and Continue"}
            </button>
          </div>
        </section>
      )}

      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}