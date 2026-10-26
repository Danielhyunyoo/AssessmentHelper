// src/pages/shared/S04CurrentAndPastObservations.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function S04CurrentAndPastObservations() {
  const location = useLocation();

  // Determine if viewing historical records only
  const [isHistoricalOnly, setIsHistoricalOnly] = useState<boolean>(() => {
    const isRegistered = localStorage.getItem("isRegisteredForCycle") === "true";
    const queryParams = new URLSearchParams(location.search);
    const viewMode = queryParams.get("mode");
    return !isRegistered || viewMode === "past_only";
  });

  // Accordion state for semester groups in Past Evaluations
  const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>({
    "Spring 2026": true,
    "Fall 2025": false,
    "Spring 2025": false,
  });

  const toggleSemester = (semester: string) => {
    setOpenSemesters((prev) => ({ ...prev, [semester]: !prev[semester] }));
  };

  return (
    <div className="dashboard-container">
      {/* Dynamic Title based on Registration Mode */}
      <h2>{isHistoricalOnly ? "Past Observations" : "Current and Past Observations"}</h2>

      {/* Deadline Reminders Banner Card */}
      <section className="table-container theme-orange reminders-card">
        <h3 className="reminders-title">DEADLINE REMINDERS</h3>

        <div className="reminders-grid">
          <div>
            <strong>Course Registration Cutoff</strong>
            <p className="reminder-date">Oct 9, 2026</p>
          </div>
          <div>
            <strong>Last Day for Classroom Visits and Signing Records</strong>
            <p className="reminder-date">Nov 15, 2026</p>
          </div>
          <div>
            <strong>End-Of-Process Survey Completion Deadline</strong>
            <p className="reminder-date">Dec 1, 2026</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 1: CURRENT PLANNED / IN-PROGRESS EVALUATIONS
          Hides automatically if user opted for previous records only
          ========================================================================= */}
      {!isHistoricalOnly && (
        <section className="dashboard-phase">
          <h3>Current Planned/In-Progress Evaluations</h3>

          <div className="table-container theme-green observation-card-wrapper">
            <div className="observation-card-grid">
              {/* Active Observation Card */}
              <div className="observation-card">
                <strong className="observation-card-title">Tuesday, Oct. 13, 2026</strong>
                <p className="observation-card-text">
                  <strong>Observer Name:</strong> Last Name, First Name
                </p>
                <p className="observation-card-text">
                  <strong>Class:</strong> CS 4349
                </p>
                <p className="observation-card-text">
                  <strong>Section:</strong> 002
                </p>
                <p className="observation-card-text">
                  <strong>Time:</strong> 1:00 PM - 2:15 PM
                </p>
                <p className="observation-card-status">
                  <strong>Status:</strong> Incomplete
                </p>

                <div className="observation-card-actions">
                  <button type="button" className="primary-btn">
                    Sign Observation Record
                  </button>
                  <button type="button" className="secondary-btn">
                    Complete Post-Observation Survey
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 2: PAST EVALUATIONS ACCORDION
          Always visible to Observees & Observers
          ========================================================================= */}
      <section className="dashboard-phase">
        <h3>Past Evaluations</h3>

        <div className="table-container accordion-wrapper">
          {["Spring 2026", "Fall 2025", "Spring 2025"].map((semester) => (
            <div key={semester} className="accordion-item">
              <div className="accordion-header" onClick={() => toggleSemester(semester)}>
                <span>{semester}</span>
                <span>{openSemesters[semester] ? "▲" : "▼"}</span>
              </div>

              {openSemesters[semester] && (
                <div className="accordion-content">
                  <div className="observation-card-history">
                    <strong className="observation-card-title">
                      Tuesday, March. 11, {semester.slice(-4)}
                    </strong>
                    <p className="observation-card-text">
                      <strong>Observer Name:</strong> Last Name, First Name
                    </p>
                    <p className="observation-card-text">
                      <strong>Class:</strong> CS 4349
                    </p>
                    <p className="observation-card-text">
                      <strong>Section:</strong> 003
                    </p>
                    <p className="observation-card-text">
                      <strong>Time:</strong> 1:00 PM - 2:15 PM
                    </p>
                    <p className="observation-card-subtext">
                      <strong>Date Finalized:</strong> April 15, {semester.slice(-4)}
                    </p>

                    <div className="observation-card-actions-row">
                      <button type="button" className="secondary-btn">
                        View Observation Record
                      </button>
                      <button type="button" className="secondary-btn">
                        View Post-Observation Survey Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Return to Dashboard Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="secondary-btn">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}