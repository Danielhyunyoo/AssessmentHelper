// src/pages/observee/E01CourseSectionSelection.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { facultyApi } from "../../api/endpoints";
import type { Course, RegistrationStatus } from "../../api/types";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function courseName(course: Course) {
  return `${course.department_code} ${course.course_number}${
    course.title ? ` — ${course.title}` : ""
  }`;
}

export default function E01CourseSelection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [registration, setRegistration] =
    useState<RegistrationStatus | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      // Keep the backend's saved selection when reopening or refreshing.
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

  async function handleSave() {
    if (selectedCourseId === "") {
      setError("Please select a course section first.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // The backend requires cycle registration before course selection.
      if (!registration?.is_registered) {
        await facultyApi.register();
      }

      // Save the actual course ID returned by Django.
      await facultyApi.selectCourse(selectedCourseId);

      // Reload authoritative state after saving.
      const [updatedStatus, updatedCourses] = await Promise.all([
        facultyApi.registrationStatus(),
        facultyApi.courses(),
      ]);

      setRegistration(updatedStatus);
      setCourses(updatedCourses);
      setSelectedCourseId(updatedStatus.selected_course_id ?? "");

      setSuccess(
        "Your course selection was saved. The confirmation notification should now be available."
      );
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
    <div className="dashboard-container">
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

          {savedCourse && (
            <div className="table-instruction">
              <h3>Your Saved Course</h3>
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
        <p>
          Select one of your current course sections for the active evaluation
          cycle. Your selection will be saved to the backend.
        </p>

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
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <button
            type="button"
            className="primary-btn"
            onClick={handleSave}
            disabled={saving || courses.length === 0 || selectedCourseId === ""}
          >
            {saving ? "Saving..." : "Save Course Selection"}
          </button>
        </div>
      </section>
    </div>
  );
}