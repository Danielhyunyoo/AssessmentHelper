
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Calendar, { DayOfWeek } from "../../components/Calendar";
import { facultyApi } from "../../api/endpoints";
import type { Course, RegistrationStatus } from "../../api/types";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function courseName(course: Course) {
  return `${course.department_code} ${course.course_number}${
    course.title ? ` - ${course.title}` : ""
  }`;
}

// Derive the allowed calendar days from schedules such as "MW 1:00 PM"
// and "TTh 1:00 PM".
function getAllowedDays(schedule: string): DayOfWeek[] {
  const prefix = schedule.split(/\d/)[0].toUpperCase().replace(/\s/g, "");
  const days: DayOfWeek[] = [];

  if (prefix.includes("M")) days.push("Mon");
  if (prefix.includes("TH")) days.push("Thu");

  const remaining = prefix.replace("TH", "");
  if (remaining.includes("T")) days.push("Tue");
  if (remaining.includes("W")) days.push("Wed");
  if (remaining.includes("F")) days.push("Fri");

  return days;
}

export default function E01CourseSelection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [registration, setRegistration] =
    useState<RegistrationStatus | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [confirmedCourseId, setConfirmedCourseId] =
    useState<number | "">("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendarSection, setShowCalendarSection] = useState(false);
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
      setSelectedCourseId(statusData.selected_course_id ?? "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load registration information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  const currentCourse = courses.find(
    (course) => course.course_id === confirmedCourseId
  );

  async function handleConfirmCourse() {
    if (selectedCourseId === "") {
      setError("Please select a course section first.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Register for the active cycle first if necessary.
      if (!registration?.is_registered) {
        await facultyApi.register();
      }

      // Save the selected course to the backend.
      await facultyApi.selectCourse(selectedCourseId);

      const updatedStatus = await facultyApi.registrationStatus();
      setRegistration(updatedStatus);
      setSelectedCourseId(updatedStatus.selected_course_id ?? "");

      // Reset dates only when changing to a different course.
      if (confirmedCourseId !== selectedCourseId) {
        setSelectedDates([]);
      }

      setConfirmedCourseId(selectedCourseId);
      setShowCalendarSection(true);
      setSuccess("Your course selection was saved successfully.");

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your course selection."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleScrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleConfirmDates() {
    if (selectedDates.length === 0) {
      setError("Please select at least one proposed observation date.");
      return;
    }

    setError("");

    // The current backend has no endpoint for saving observation dates.
    // This confirms the calendar selection in the UI only.
    alert(
      `Selected ${selectedDates.length} proposed dates for ${courseName(
        currentCourse!
      )}, section ${currentCourse!.section}. These dates have not been saved to the database.`
    );
  }

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
      <h2>Course and Section Selection</h2>

      {error && (
        <div role="alert" className="yellow-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div role="status" className="yellow-banner">
          <strong>Success:</strong> {success}
          <p>
            <Link to="/shared/notifications">
              View confirmation notifications
            </Link>
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
            {registration.has_selected_course
              ? "Course selected"
              : "No course selected yet"}
          </p>
          <p>
            <strong>Signup deadline:</strong>{" "}
            {formatDate(registration.signup_deadline)}
          </p>
        </section>
      )}

      <section className="dashboard-phase">
        <h3>Course Registration for Observation Cycle</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> Select one of your current course
          sections for the active evaluation cycle. Your selection will be
          saved to the backend.
        </div>

        {courses.length === 0 ? (
          <p>
            No current course sections were returned for your account. Ask the
            team to check the demo account's course assignments.
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
                          onChange={() =>
                            setSelectedCourseId(course.course_id)
                          }
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

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1rem",
          }}
        >
          <button
            type="button"
            className="primary-btn"
            onClick={handleConfirmCourse}
            disabled={saving || courses.length === 0 || selectedCourseId === ""}
          >
            {saving
              ? "Saving..."
              : "Confirm Class and Select Observation Date"}
          </button>
        </div>
      </section>

      {showCalendarSection && currentCourse && (
        <section
          ref={bottomRef}
          className="table-container theme-orange"
          style={{ padding: "1.5rem", marginTop: "2rem" }}
        >
          <div className="yellow-banner" style={{ marginBottom: "1.5rem" }}>
            <strong>IMPORTANT:</strong> Proposed observation dates must fall
            between October 1 and November 15, 2026. You can select up to 8
            dates.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2rem",
              alignItems: "start",
            }}
          >
            <div>
              <h3>Your Registered Course Information</h3>
              <p>
                <strong>Course:</strong> {courseName(currentCourse)}
              </p>
              <p>
                <strong>Course Section:</strong> {currentCourse.section}
              </p>
              <p>
                <strong>Meeting Days and Times:</strong>{" "}
                {currentCourse.schedule}
              </p>
              <p>
                <strong>Classroom:</strong>{" "}
                {currentCourse.classroom || "Not provided"}
              </p>
              <p style={{ marginTop: "1rem" }}>
                <em>Selected dates: {selectedDates.length} / 8 maximum</em>
              </p>
            </div>

            <div>
              <Calendar
                selectedDates={selectedDates}
                onDateSelectionChange={setSelectedDates}
                allowedDaysOfWeek={getAllowedDays(currentCourse.schedule)}
                maxSelections={8}
                minDate="2026-10-01"
                maxDate="2026-11-15"
                initialMonth={9}
                initialYear={2026}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
              marginTop: "2rem",
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              onClick={handleScrollToTop}
            >
              Select a Different Course or Section
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirmDates}
            >
              Confirm Selected Dates and Continue
            </button>
          </div>
        </section>
      )}
    </div>
  );
}