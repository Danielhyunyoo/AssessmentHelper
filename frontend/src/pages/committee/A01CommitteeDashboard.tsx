// src/pages/committee/A01CommitteeDashboard.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { JsonObject } from "../../api/types";

import observer_selection_matching_card from "../../assets/observer_selection_matching_card.jpg";
import unmatched_observees_card from "../../assets/unmatched_observees_card.jpg";
import observation_record_management_card from "../../assets/observation_record_management_card.jpg";
import pending_observation_records_card from "../../assets/pending_observation_records_card.jpg";
import observation_surveys_card from "../../assets/observation_surveys_card.jpg";
import kpis_card from "../../assets/kpis_card.jpg";
import edit_form_card from "../../assets/edit_form_card.jpg";

export default function A01CommitteeDashboard() {
  const [dashboard, setDashboard] = useState<JsonObject | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    committeeApi.dashboard()
      .then(setDashboard)
      .catch(() => {
        navigate("/shared/faculty-dashboard");
      });
  }, []);

  const cycle = dashboard?.cycle as Record<string, unknown> | undefined;
  const counts = dashboard?.counts as Record<string, unknown> | undefined;
  const alerts = dashboard?.alerts as
    | { code: string; message: string; count: number; destination: string }[]
    | undefined;

  if (!dashboard) {
    return (
      <div className="dashboard-container">
        <p>Checking committee permissions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h2>Assessment Committee Dashboard</h2>

      {counts && (
        <section className="table-container summary-card-padding">
          <h3>Current Cycle Overview</h3>
          <p>Cycle: {String(cycle?.name ?? "Loading...")}</p>
          <p>Active faculty: {String(counts.active_faculty ?? 0)}</p>
          <p>Registered faculty: {String(counts.registered_faculty ?? 0)}</p>
          <p>Unregistered faculty: {String(counts.unregistered_faculty ?? 0)}</p>
          <p>Pending observation records: {String(counts.pending_observation_records ?? 0)}</p>
          <p>Missing surveys: {counts.surveys_open === false ? "surveys not open yet" : String(counts.missing_surveys ?? 0)}</p>
        </section>
      )}

      {/* Phase 1 Section */}
      <section className="dashboard-phase">
        <h3>Phase 1: Registration & Observer Matching</h3>
        <div className="reminder-banner">
          <p>
            <strong>Registration deadline:</strong>{" "}
            {cycle?.signup_deadline
              ? new Date(String(cycle.signup_deadline)).toLocaleDateString()
              : "Loading..."}
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/committee/faculty-matching">
              <img src={observer_selection_matching_card} alt="Observer Selection and Matching" />
              <h4>Observer Selection/Matching</h4>
              <p>Review automatically and manually-curated matched observer lists</p>
              {dashboard && (
                <span className="card-status">
                  {Boolean(
                    (dashboard.phases as Record<string, unknown> | undefined)
                      ?.registration_closed
                  )
                    ? "Registration period closed"
                    : "Registration period open"}
                </span>
              )}
            </Link>
          </article>

          <article className="dashboard-card">
            <Link to="/committee/unmatched-observees">
              <img src={unmatched_observees_card} alt="Unmatched Observees" />
              <h4>Unmatched Observees</h4>
              <p>Move any Observees with insufficient matched observer candidates to next semester's Due list</p>
            </Link>
          </article>

          <article className="dashboard-card">
            <Link to="/committee/faculty-roster">
              <img src={observation_record_management_card} alt="Observation Record Management" />
              <h4>Observation Record Management</h4>
              <p>Monitor course registrations and dispatch reminders to due or overdue faculty before the Oct 9 cutoff</p>
            </Link>
          </article>
        </div>
      </section>

      {/* Phase 2 Section */}
      <section className="dashboard-phase">
        <h3>Phase 2: In-Progress Observations</h3>
        <div className="reminder-banner">
          <p>
            <strong>Observation deadline:</strong>{" "}
            {cycle?.observation_deadline
              ? new Date(String(cycle.observation_deadline)).toLocaleDateString()
              : "Loading..."}
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/committee/pending-records">
              <img src={pending_observation_records_card} alt="Pending Observation Records" />
              <h4>Pending Observation Records</h4>
              <p>Remind observees and observers to submit signed records before the deadline.</p>
            </Link>
          </article>
        </div>
      </section>

      {/* Phase 3 Section */}
      <section className="dashboard-phase">
        <h3>Phase 3: Post-Observation Surveys and KPIs</h3>
        <div className="reminder-banner">
          <p>
            <strong>Survey deadline:</strong>{" "}
            {cycle?.survey_deadline
              ? new Date(String(cycle.survey_deadline)).toLocaleDateString()
              : "Loading..."}
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/committee/survey-tracking">
              <img src={observation_surveys_card} alt="Observation Surveys" />
              <h4>Observation Surveys</h4>
              <p>Remind faculty members to complete their surveys before the deadline</p>
            </Link>
          </article>

          <article className="dashboard-card">
            <Link to="/committee/kpi-overview">
              <img src={kpis_card} alt="Generated KPIs" />
              <h4>Generated KPIs</h4>
              <p>View and download system-generated KPIs</p>
            </Link>
          </article>
        </div>
      </section>

      {/* Form Management & Alerts Section */}
      <section className="dashboard-phase">
        <h3>Form Management and Alerts</h3>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/committee/form-editor">
              <img src={edit_form_card} alt="Edit Evaluation and Survey Forms" />
              <h4>Edit Evaluation/Survey Forms</h4>
              <p>Create, update or edit post-observation feedback survey forms</p>
            </Link>
          </article>

          {/* Stretched Notification Card matching Header Pop-up with Scrollbar */}
          <article className="dashboard-card notification-card stretched-notification-card">
            <h4>Alerts and Notifications</h4>

            {error && <p role="alert">{error}</p>}

            {!dashboard && !error && <p>Loading dashboard...</p>}

            {alerts?.length === 0 && (
              <p>No outstanding committee alerts.</p>
            )}

            {alerts?.map((alert) => (
              <Link 
                key={alert.code} 
                to={alert.destination} 
                className="dashboard-notif-item"
              >
                <p className="dashboard-notif-title">{alert.message}</p>
                <span className="dashboard-notif-link">View details</span>
              </Link>
            ))}
          </article>
        </div>
      </section>
    </div>
  );
}