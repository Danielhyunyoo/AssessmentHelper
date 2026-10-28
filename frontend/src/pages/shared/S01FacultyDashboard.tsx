// src/pages/shared/S01FacultyDashboard.tsx
import { useEffect, useState } from "react";
import { authApi, facultyApi } from "../../api/endpoints";
import type { FacultyDashboard, Professor } from "../../api/types";
import { Link } from "react-router-dom";

import profile_and_evaluation_status_card from "../../assets/profile_and_evaluation_status_card.jpg";
import alerts_and_notifications_card from "../../assets/alerts_and_notifications_card.jpg";
import post_evaluation_survey_card from "../../assets/post_evaluation_survey_card.jpg";
import current_and_past_observations_card from "../../assets/current_and_past_observations_card.jpg";
import course_and_section_selection_card from "../../assets/course_and_section_selection_card.jpg";
import active_observations_card from "../../assets/active_observations_card.jpg";

export default function S01FacultyDashboard() {
  const [dashboard, setDashboard] = useState<FacultyDashboard | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    facultyApi.dashboard()
      .then(setDashboard)
      .catch((err: unknown) => {
        setDashboardError(
          err instanceof Error
            ? err.message
            : "Could not load dashboard information."
        );
      })
      .finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    authApi.session()
      .then(({ professor }) => {
        if (!cancelled) setCurrentUser(professor);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setRoleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canUseFacultyModules =
    !!currentUser && currentUser.role !== "admin";

  return (
    <div className="dashboard-container">
      <h2>Faculty Dashboard</h2>

      <section className="dashboard-phase">
        <h3>Current Registration</h3>

        {dashboardLoading && <p>Loading registration status...</p>}

        {dashboardError && (
          <p role="alert">
            Could not load live dashboard data: {dashboardError}
          </p>
        )}

        {dashboard && (
          <div className="table-container theme-blue" style={{ padding: "1rem" }}>
            <p>
              <strong>Evaluation cycle:</strong> {dashboard.cycle.name}
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <strong>Registration:</strong>{" "}
              {dashboard.is_registered ? "Registered" : "Not registered"}
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <strong>Course selection:</strong>{" "}
              {dashboard.has_selected_course ? "Saved" : "Not selected"}
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <Link to="/shared/notifications">
                <strong>Unread notifications:</strong> {dashboard.unread_notifications}
              </Link>
            </p>
          </div>
        )}
      </section>
      
      {roleLoading && <p>Checking account permissions...</p>}

      {/* General Modules Section */}
      <section className="dashboard-phase">
        <h3>General Modules</h3>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/shared/profile">
              <img src={profile_and_evaluation_status_card} alt="Profile and Evaluation Status" />
              <h4>Profile and Evaluation Status</h4>
              <p>View current status, hire level, due semester</p>
            </Link>
          </article>

          <article className="dashboard-card">
            <Link to="/shared/notifications">
              <img src={alerts_and_notifications_card} alt="Alerts and Notifications" />
              <h4>Alerts and Notifications</h4>
              <p>View status of any sent request(s), deadlines or more feedback</p>
            </Link>
          </article>

          {canUseFacultyModules && (
            <article className="dashboard-card">
              <Link to="/shared/post-evaluation-survey">
                <img src={post_evaluation_survey_card} alt="Post-Evaluation Survey" />
                <h4>Post-Evaluation Survey</h4>
                <p>Unlocks after the observation period ends (Nov 15)</p>
                <span className="card-status">LOCKED UNTIL NOV 15</span>
              </Link>
            </article>
          )}
        </div>
      </section>

      {canUseFacultyModules && (
        <>
          {/* Observee Modules Section */}
          <section className="dashboard-phase">
            <h3>Observee Modules</h3>

            <div className="card-grid">
              <article className="dashboard-card">
                <Link to="/observee/current-past-observations">
                  <img src={current_and_past_observations_card} alt="Current and Past Observations" />
                  <h4>Current and Past Observations</h4>
                  <p>View observation status</p>
                </Link>
              </article>

              <article className="dashboard-card">
                <Link to="/observee/course-selection">
                  <img src={course_and_section_selection_card} alt="Course and Section Selection" />
                  <h4>Course and Section Selection</h4>
                  <p>Register or view my chosen class section for the current evaluation cycle</p>
                </Link>
              </article>
            </div>
          </section>

          {/* Observer Modules Section */}
          <section className="dashboard-phase">
            <h3>Observer Modules</h3>

            <div className="card-grid">
              <article className="dashboard-card">
                <Link to="/observer/active-observations">
                  <img src={active_observations_card} alt="Active Observations" />
                  <h4>Active Observations</h4>
                  <p>Upload forms and view confirmations</p>
                </Link>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}