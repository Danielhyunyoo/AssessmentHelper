// src/pages/shared/S04CurrentAndPastObservations.tsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function S04CurrentAndPastObservations() {
  // Demo toggle state to switch between active observations vs none
  const [hasActiveObservation, setHasActiveObservation] = useState<boolean>(true);

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

      {/* Current Observations Section */}
      <section className="dashboard-phase">
        <div className="section-header-bar">
          <h3>Current Evaluations</h3>
          <button
            type="button"
            className="secondary-btn btn-demo-toggle"
            onClick={() => setHasActiveObservation(!hasActiveObservation)}
          >
            Demo Toggle: {hasActiveObservation ? "Showing Active" : "Showing None"}
          </button>
        </div>

        <div className="table-container theme-green observation-card-wrapper">
          {!hasActiveObservation ? (
            <div className="observation-empty-state">
              No current observations
            </div>
          ) : (
            <div className="observation-cards-container">
              {/* Left Card: Observee */}
              <div className="observation-card-history">
                <div className="observation-card-header">
                  <strong className="observation-card-title">
                    Tuesday, Oct. 13, 2026
                  </strong>
                  <span className="pill-badge pill-observee">
                    Observee
                  </span>
                </div>

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
                <p className="observation-card-subtext">
                  <strong>Status:</strong> Incomplete
                </p>

                <div className="observation-card-actions">
                  <button type="button" className="btn-primary">
                    View Observation Record
                  </button>
                  <button type="button" className="btn-secondary">
                    View Post-Observation Survey
                  </button>
                </div>
              </div>

              {/* Right Card: Observer */}
              <div className="observation-card-history">
                <div className="observation-card-header">
                  <strong className="observation-card-title">
                    Thursday, Oct. 22, 2026
                  </strong>
                  <span className="pill-badge pill-observer">
                    Observer
                  </span>
                </div>

                <p className="observation-card-text">
                  <strong>Observee Name:</strong> Smith, Jane
                </p>
                <p className="observation-card-text">
                  <strong>Class:</strong> CS 3345
                </p>
                <p className="observation-card-text">
                  <strong>Section:</strong> 001
                </p>
                <p className="observation-card-text">
                  <strong>Time:</strong> 10:00 AM - 11:15 AM
                </p>
                <p className="observation-card-subtext">
                  <strong>Status:</strong> Pending Review
                </p>

                <div className="observation-card-actions">
                  <button type="button" className="btn-primary">
                    View Observation Record
                  </button>
                  <button type="button" className="btn-secondary">
                    View Post-Observation Survey
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Past Evaluations Accordion Section */}
      <section className="dashboard-phase">
        <h3>Past Evaluations</h3>

        <div className="table-container accordion-wrapper">
          {/* Spring 2026: Two cards (Left: Observee, Right: Observer) */}
          <div className="accordion-item">
            <div className="accordion-header" onClick={() => toggleSemester("Spring 2026")}>
              <span>Spring 2026</span>
              <span>{openSemesters["Spring 2026"] ? "▲" : "▼"}</span>
            </div>

            {openSemesters["Spring 2026"] && (
              <div className="accordion-content">
                <div className="observation-cards-container">
                  {/* Left Card: Observee */}
                  <div className="observation-card-history">
                    <div className="observation-card-header">
                      <strong className="observation-card-title">
                        Tuesday, March 11, 2026
                      </strong>
                      <span className="pill-badge pill-observee">
                        Observee
                      </span>
                    </div>

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
                      <strong>Date Finalized:</strong> April 15, 2026
                    </p>

                    <div className="observation-card-actions">
                      <button type="button" className="btn-primary">
                        View Observation Record
                      </button>
                      <button type="button" className="btn-secondary">
                        View Post-Observation Survey
                      </button>
                    </div>
                  </div>

                  {/* Right Card: Observer */}
                  <div className="observation-card-history">
                    <div className="observation-card-header">
                      <strong className="observation-card-title">
                        Thursday, March 26, 2026
                      </strong>
                      <span className="pill-badge pill-observer">
                        Observer
                      </span>
                    </div>

                    <p className="observation-card-text">
                      <strong>Observee Name:</strong> Johnson, Mark
                    </p>
                    <p className="observation-card-text">
                      <strong>Class:</strong> SE 3354
                    </p>
                    <p className="observation-card-text">
                      <strong>Section:</strong> 001
                    </p>
                    <p className="observation-card-text">
                      <strong>Time:</strong> 2:30 PM - 3:45 PM
                    </p>
                    <p className="observation-card-subtext">
                      <strong>Date Finalized:</strong> April 20, 2026
                    </p>

                    <div className="observation-card-actions">
                      <button type="button" className="btn-primary">
                        View Observation Record
                      </button>
                      <button type="button" className="btn-secondary">
                        View Post-Observation Survey
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fall 2025: Single Observee Card */}
          <div className="accordion-item">
            <div className="accordion-header" onClick={() => toggleSemester("Fall 2025")}>
              <span>Fall 2025</span>
              <span>{openSemesters["Fall 2025"] ? "▲" : "▼"}</span>
            </div>

            {openSemesters["Fall 2025"] && (
              <div className="accordion-content">
                <div className="observation-cards-container">
                  <div className="observation-card-history">
                    <div className="observation-card-header">
                      <strong className="observation-card-title">
                        Tuesday, Oct. 14, 2025
                      </strong>
                      <span className="pill-badge pill-observee">
                        Observee
                      </span>
                    </div>

                    <p className="observation-card-text">
                      <strong>Observer Name:</strong> Last Name, First Name
                    </p>
                    <p className="observation-card-text">
                      <strong>Class:</strong> CS 4349
                    </p>
                    <p className="observation-card-text">
                      <strong>Section:</strong> 001
                    </p>
                    <p className="observation-card-text">
                      <strong>Time:</strong> 1:00 PM - 2:15 PM
                    </p>
                    <p className="observation-card-subtext">
                      <strong>Date Finalized:</strong> Nov. 18, 2025
                    </p>

                    <div className="observation-card-actions">
                      <button type="button" className="btn-primary">
                        View Observation Record
                      </button>
                      <button type="button" className="btn-secondary">
                        View Post-Observation Survey
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spring 2025: Single Observee Card */}
          <div className="accordion-item">
            <div className="accordion-header" onClick={() => toggleSemester("Spring 2025")}>
              <span>Spring 2025</span>
              <span>{openSemesters["Spring 2025"] ? "▲" : "▼"}</span>
            </div>

            {openSemesters["Spring 2025"] && (
              <div className="accordion-content">
                <div className="observation-cards-container">
                  <div className="observation-card-history">
                    <div className="observation-card-header">
                      <strong className="observation-card-title">
                        Thursday, March 13, 2025
                      </strong>
                      <span className="pill-badge pill-observee">
                        Observee
                      </span>
                    </div>

                    <p className="observation-card-text">
                      <strong>Observer Name:</strong> Last Name, First Name
                    </p>
                    <p className="observation-card-text">
                      <strong>Class:</strong> CS 3305
                    </p>
                    <p className="observation-card-text">
                      <strong>Section:</strong> 002
                    </p>
                    <p className="observation-card-text">
                      <strong>Time:</strong> 10:00 AM - 11:15 AM
                    </p>
                    <p className="observation-card-subtext">
                      <strong>Date Finalized:</strong> April 17, 2025
                    </p>

                    <div className="observation-card-actions">
                      <button type="button" className="btn-primary">
                        View Observation Record
                      </button>
                      <button type="button" className="btn-secondary">
                        View Post-Observation Survey
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Centered Return Button */}
        <div className="dashboard-center-action">
          <Link to="/shared/faculty-dashboard" className="btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}