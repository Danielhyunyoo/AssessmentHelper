// src/pages/observee/E01CourseSelection.tsx
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { facultyApi } from "../../api/endpoints";
import type { Course, RegistrationStatus } from "../../api/types";
import Calendar, { DayOfWeek } from "../../components/Calendar";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function extractCourseStartTime(schedule: string): string {
  const match = schedule.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]/i
  );

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
  if (upper.includes("TU") || (upper.includes("T") && !upper.includes("TH"))) days.push("Tue");
  if (upper.includes("W")) days.push("Wed");
  if (upper.includes("TH")) days.push("Thu");
  if (upper.includes("F")) days.push("Fri");

  return days.length > 0 ? days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
}

export default function E01CourseSelection() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [confirmedCourseId, setConfirmedCourseId] = useState<number | "">("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendarSection, setShowCalendarSection] = useState<boolean>(false);

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
      const [courseData, statusData] = await Promise.all([
        facultyApi.courses(),
        facultyApi.registrationStatus(),
      ]);

      setCourses(courseData);
      setRegistration(statusData);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load registration information.";
      window.alert(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const tomorrowIsoDate = registration ? nextDay(registration.today) : "";

  const earliestAllowedDate =
    registration?.start_date && registration.start_date > tomorrowIsoDate
      ? registration.start_date
      : tomorrowIsoDate;

  const confirmedCourse = courses.find((c) => c.course_id === confirmedCourseId);
  const allowedDays = confirmedCourse ? parseAllowedDays(confirmedCourse.schedule) : ["Mon", "Wed", "Thu"];
  const calendarStart = selectedDates.length > 0
    ? new Date(`${[...selectedDates].sort()[0]}T00:00:00`)
    : firstClassDay(earliestAllowedDate, allowedDays);

  const handleConfirmClass = async () => {
    if (selectedCourseId === "") {
      const msg = "Please select a course section first.";
      window.alert(msg);
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
      setSuccess("Course section saved! Please select your observation dates below.");
      setDatesSaved(false);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to confirm course selection.";
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
      const msg = "Please confirm a course section before selecting observation dates.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    const courseStartTime = extractCourseStartTime(confirmedCourse.schedule);

    if (!courseStartTime) {
      const msg = "The selected course's meeting time could not be determined. Please contact the team to check the course schedule.";
      setCalendarError(msg);
      window.alert(msg);
      return;
    }

    setSaving(true);
    setCalendarError("");
    setSuccess("");

    try {
      const proposedDateTimes = selectedDates.map((date) => {
        const localDateTime = new Date(`${date}T${courseStartTime}:00`);

        if (Number.isNaN(localDateTime.getTime())) {
          throw new Error(`Invalid date or course time: ${date} ${courseStartTime}`);
        }

        return localDateTime.toISOString();
      });

      await facultyApi.saveAvailability(proposedDateTimes);
      window.dispatchEvent(new Event("notifications-changed"));

      setSuccess(
        `Your course and ${proposedDateTimes.length} proposed observation date/time choices were saved to the database.`
      );
      setDatesSaved(true);

      navigate("/observee/observer-selection");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save your observation dates.";
      setCalendarError(msg);
      window.alert(msg);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  const savedCourse = courses.find(
    (course) => course.course_id === registration?.selected_course_id
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <h2>Course and Section Selection</h2>
        <p>Loading your registration and course sections...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container" ref={topRef}>
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Course and Section Selection</h2>

      {success && (
        <div role="status" className="feedback-banner-success">
          <strong>Success:</strong> {success}
          {datesSaved && (
            <p style={{ marginTop: "0.25rem" }}>
              Click <Link to="/observee/observer-selection">here</Link> to continue to Observer Selection.
            </p>
          )}
        </div>
      )}

      {registration && (
        <section className="dashboard-phase">
          <h3>{registration.cycle_name} Registration</h3>
          <p style={{ marginBottom: "0.75rem" }}>
            <strong>Signup deadline:</strong> {formatDate(registration.signup_deadline)}
          </p>

          {savedCourse && (
            <div className="table-instruction" style={{ marginTop: "0.5rem" }}>
              <h3 style={{ fontSize: "0.95rem" }}>Your Registered Course</h3>
              <p style={{ margin: "0.25rem 0" }}>{courseName(savedCourse)}</p>
              <p style={{ margin: "0.25rem 0" }}>Section: {savedCourse.section}</p>
              <p style={{ margin: "0.25rem 0" }}>Meeting times: {savedCourse.schedule}</p>
              <p style={{ margin: "0.25rem 0" }}>Classroom: {savedCourse.classroom || "Not provided"}</p>
            </div>
          )}
        </section>
      )}

      <section className="dashboard-phase">
        <h3>Select a Course Section</h3>
        <div className="yellow-banner" style={{ marginBottom: "1rem" }}>
          <strong>IMPORTANT:</strong> Course registration closes {registration && formatDate(registration.signup_deadline)} at 11:59 PM. You must select and register 1 active course section.
        </div>

        {courses.length === 0 ? (
          <p>
            No current course sections were returned for your account. Ask the team to check the demo account's course assignments.
          </p>
        ) : (
          <div className="table-container theme-green">
            <div className="table-scroll-wrapper">
              <table className="custom-data-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Meeting Times</th>
                    <th>Classroom</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.course_id}>
                      <td>
                        <input
                          type="radio"
                          name="course"
                          value={course.course_id}
                          checked={selectedCourseId === course.course_id}
                          onChange={() => setSelectedCourseId(course.course_id)}
                          disabled={saving}
                          aria-label={`Select ${courseName(course)}, section ${course.section}`}
                        />
                      </td>
                      <td>{courseName(course)}</td>
                      <td>{course.section}</td>
                      <td>{course.schedule}</td>
                      <td>{course.classroom || "Not provided"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmClass}
            disabled={saving || courses.length === 0 || selectedCourseId === ""}
          >
            {saving ? "Saving..." : "Confirm Class and Select Observation Date"}
          </button>
        </div>
      </section>

      {/* Calendar Section */}
      {showCalendarSection && confirmedCourse && (
        <section ref={bottomRef} className="dashboard-phase" style={{ marginTop: "2rem" }}>
          <h3>Select Proposed Observation Dates</h3>

          <div className="yellow-banner" style={{ marginBottom: "1rem" }}>
            <strong>IMPORTANT:</strong> Please make sure ALL proposed Observation Dates fall on or before {registration && formatDate(registration.observation_deadline)}. Select 4 to 8 dates.
          </div>

          {calendarError && (
            <p style={{ color: "#ef4444", fontWeight: 600, fontSize: "0.9rem", margin: "0 0 1rem 0" }}>
              {calendarError}
            </p>
          )}

          <div
            className="table-container theme-orange"
            style={{ padding: "1.5rem" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", justifyContent: "center" }}>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "0.15rem", color: "inherit" }}>Your Registered Course Preview</h3>
                <p style={{ margin: 0, lineHeight: "1.4" }}><strong>Course:</strong> {courseName(confirmedCourse)}</p>
                <p style={{ margin: 0, lineHeight: "1.4" }}><strong>Section:</strong> {confirmedCourse.section}</p>
                <p style={{ margin: 0, lineHeight: "1.4" }}><strong>Meeting Time:</strong> {confirmedCourse.schedule}</p>
                <p style={{ margin: 0, lineHeight: "1.4" }}><strong>Classroom:</strong> {confirmedCourse.classroom || "Not provided"}</p>
                
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.85rem", opacity: 0.75 }}>
                    <em>Selected Dates: {selectedDates.length} / 8 (minimum 4 required)</em>
                  </p>
                  {selectedDates.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {[...selectedDates].sort().map((dateStr, idx) => {
                        const formatted = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        return (
                          <span key={idx} className="version-pill font-semibold" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
                            {formatted}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Calendar
                  selectedDates={selectedDates}
                  onDateSelectionChange={handleDateSelectionChange}
                  allowedDaysOfWeek={allowedDays as DayOfWeek[]}
                  maxSelections={99}
                  minDate={earliestAllowedDate}
                  maxDate={registration?.observation_deadline}
                  initialMonth={calendarStart.getMonth()}
                  initialYear={calendarStart.getFullYear()}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <button type="button" className="btn-secondary" onClick={handleScrollToTop}>
              Select a Different Course or Section
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleFinalSave}
              disabled={saving || selectedDates.length < 4}
            >
              {saving ? "Saving..." : "Confirm Selected Dates and Continue"}
            </button>
          </div>
        </section>
      )}

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}