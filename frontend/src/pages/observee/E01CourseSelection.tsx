// src/pages/observee/E01CourseSelection.tsx
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { facultyApi } from "../../api/endpoints";
import type { Course, RegistrationStatus } from "../../api/types";
import Calendar, { DayOfWeek } from "../../components/Calendar";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}


function extractCourseStartTime(schedule: string): string {
  // Supports formats such as:
  // "MW 1:00 PM - 2:15 PM"
  // "MWF 10:00-10:50"
  // "TR 13:00-14:15"

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
  if (upper.includes("TTH") || upper.includes("TU")) return ["Tue", "Thu"];
  if (upper.includes("M")) days.push("Mon");
  if (upper.includes("TU") || (upper.includes("T") && !upper.includes("TH"))) days.push("Tue");
  if (upper.includes("W")) days.push("Wed");
  if (upper.includes("TH")) days.push("Thu");
  if (upper.includes("F")) days.push("Fri");

  return days.length > 0 ? days : ["Mon", "Tue", "Wed", "Thu", "Fri"];
}

export default function E01CourseSelection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [confirmedCourseId, setConfirmedCourseId] = useState<number | "">("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendarSection, setShowCalendarSection] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadPage() {
    setLoading(true);
    setError("");

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

          setSelectedDates(
            savedDateTimes
              .map(localDateString)
              .filter(Boolean)
          );

        } catch {
          // Keep the page usable if availability has not been saved yet.
          setSelectedDates([]);
        }
      }

      const savedId = statusData.selected_course_id ?? "";
      setSelectedCourseId(savedId);
      setConfirmedCourseId(savedId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load registration information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const today = new Date();
  const todayIsoDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const earliestAllowedDate =
    registration?.start_date && registration.start_date > todayIsoDate
      ? registration.start_date
      : todayIsoDate;

  const confirmedCourse = courses.find((c) => c.course_id === confirmedCourseId);
  const allowedDays = confirmedCourse ? parseAllowedDays(confirmedCourse.schedule) : ["Mon", "Wed", "Thu"];

  const handleConfirmClass = async () => {
    if (selectedCourseId === "") {
      setError("Please select a course section first.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!registration?.is_registered) {
        await facultyApi.register();
      }

      await facultyApi.selectCourse(Number(selectedCourseId));
      setConfirmedCourseId(selectedCourseId);

      if (selectedCourseId !== confirmedCourseId) {
        setSelectedDates([]);

        try {
          await facultyApi.saveAvailability([]);
        } catch {
          // The selected course is still saved. The next availability save
          // will overwrite the old dates.
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

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to confirm course selection."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleScrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function handleFinalSave() {
    if (confirmedCourseId === "") {
      setError("Please select a course section first.");
      return;
    }

    if (selectedDates.length < 4) {
      setError("Please select at least four observation dates before submitting.");
      return;
    }

    if (selectedDates.length > 8) {
      setError("You can select at most eight observation dates.");
      return;
    }

    if (!confirmedCourse) {
      setError("Please confirm a course section before selecting observation dates.");
      return;
    }

    const courseStartTime = extractCourseStartTime(confirmedCourse.schedule);

    console.log("Selected course:", confirmedCourse);
    console.log("Course schedule:", confirmedCourse?.schedule);

    if (!courseStartTime) {
      setError(
        "The selected course's meeting time could not be determined. Please contact the team to check the course schedule."
      );
      return;
    }

    setSaving(true);
    setError("");
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

      setSuccess(
        `Your course and ${proposedDateTimes.length} proposed observation date/time choices were saved to the database.`
      );

      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your observation dates."
      );
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

      {error && (
        <div role="alert" className="yellow-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div role="status" className="yellow-banner">
          <strong>Success:</strong> {success}
          <p style={{ marginTop: "0.25rem" }}>
            <Link to="/shared/notifications">View confirmation notifications</Link>
          </p>
        </div>
      )}

      {registration && (
        <section className="dashboard-phase">
          <h3>{registration.cycle_name} Registration</h3>

          <p>
            <strong>Registration status:</strong>{" "}
            {registration.is_registered ? "Registered" : "Not registered"}
          </p>

          <p>
            <strong>Course selection:</strong>{" "}
            {registration.has_selected_course ? "Course selected" : "No course selected yet"}
          </p>

          <p>
            <strong>Signup deadline:</strong> {formatDate(registration.signup_deadline)}
          </p>

          {savedCourse && (
            <div className="table-instruction" style={{ marginTop: "0.5rem" }}>
              <h3 style={{ fontSize: "0.95rem" }}>Your Saved Course</h3>
              <p>{courseName(savedCourse)}</p>
              <p>Section: {savedCourse.section}</p>
              <p>Meeting times: {savedCourse.schedule}</p>
              <p>Classroom: {savedCourse.classroom || "Not provided"}</p>
            </div>
          )}
        </section>
      )}

      <section className="dashboard-phase">
        <h3>Select a Course Section</h3>
        <div className="yellow-banner" style={{ marginBottom: "1rem" }}>
          <strong>IMPORTANT:</strong> Course registration closes October 9 at 11:59 PM. You must select and register 1 active course section.
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
        <section
          ref={bottomRef}
          className="table-container theme-orange"
          style={{ padding: "1.5rem", marginTop: "2rem" }}
        >
          <div className="yellow-banner" style={{ marginBottom: "1.5rem" }}>
            <strong>IMPORTANT:</strong> Select at least 4 and at most 8 observation dates within the allowed observation period.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your Registered Course Information</h3>
              <p><strong>Course Number and Title:</strong> {courseName(confirmedCourse)}</p>
              <p style={{ marginTop: "0.5rem" }}><strong>Course Section:</strong> Section {confirmedCourse.section}</p>
              <p style={{ marginTop: "0.5rem" }}><strong>Meeting Days and Times:</strong> {confirmedCourse.schedule}</p>
              <p style={{ marginTop: "0.5rem" }}><strong>Classroom Location(s):</strong> {confirmedCourse.classroom || "Not provided"}</p>
              <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#475569" }}>
                <em>Selected Dates: {selectedDates.length} / 8 (minimum 4 required)</em>
              </p>
            </div>

            <div>
              <Calendar
                selectedDates={selectedDates}
                onDateSelectionChange={setSelectedDates}
                allowedDaysOfWeek={allowedDays as DayOfWeek[]}
                maxSelections={8}
                minDate={earliestAllowedDate}
                maxDate={registration?.observation_deadline}
                initialMonth={
                  registration
                    ? new Date(`${registration.start_date}T00:00:00`).getMonth()
                    : new Date().getMonth()
                }
                initialYear={
                  registration
                    ? new Date(`${registration.start_date}T00:00:00`).getFullYear()
                    : new Date().getFullYear()
                }
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
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