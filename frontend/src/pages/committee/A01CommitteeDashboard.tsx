// src/pages/committee/A01CommitteeDashboard.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { JsonObject } from "../../api/types";
import { formatDate } from "../../api/format";

import observer_selection_matching_card from "../../assets/observer_selection_matching_card.jpg";
import unmatched_observees_card from "../../assets/unmatched_observees_card.jpg";
import observation_record_management_card from "../../assets/observation_record_management_card.jpg";
import pending_observation_records_card from "../../assets/pending_observation_records_card.jpg";
import observation_surveys_card from "../../assets/observation_surveys_card.jpg";
import kpis_card from "../../assets/kpis_card.jpg";
import edit_form_card from "../../assets/edit_form_card.jpg";

export default function A01CommitteeDashboard() {
  const [dashboard, setDashboard] = useState<JsonObject | null>(null);
  const [error] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    committeeApi
      .dashboard()
      .then(setDashboard)
      .catch(() => {
        navigate("/shared/faculty-dashboard");
      });
  }, [navigate]);

  const cycle = dashboard?.cycle as Record<string, unknown> | undefined;
  const counts = dashboard?.counts as Record<string, unknown> | undefined;
  const phases = dashboard?.phases as Record<string, unknown> | undefined;
  const alerts = dashboard?.alerts as
    | { code: string; message: string; count: number; destination: string }[]
    | undefined;

  if (!dashboard) {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">Checking committee permissions...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header with Cycle Badge */}
      <div className="a01-page-header">
        <h2>Assessment Committee Dashboard</h2>
        <span className="a01-cycle-badge">
          Cycle: {String(cycle?.name ?? "Loading...")}
        </span>
      </div>

      {/* Current Cycle Overview (Exact original metrics in card grid) */}
      {counts && (
        <section className="a01-overview-section">
          <div className="a01-overview-header">
            <h3>Current Cycle Overview</h3>
          </div>

          <div className="kpi-cards-grid">
            <Link
              to="/committee/faculty-roster"
              className="kpi-card kpi-card-link a07-kpi-accent-slate"
            >
              <div className="kpi-card-header">
                <span className="kpi-card-label">Active Faculty</span>
              </div>
              <div className="kpi-card-value">
                {String(counts.active_faculty ?? 0)}
              </div>
            </Link>

            <Link
              to="/committee/faculty-matching"
              className="kpi-card kpi-card-link a07-kpi-accent-green"
            >
              <div className="kpi-card-header">
                <span className="kpi-card-label">Registered Faculty</span>
              </div>
              <div className="kpi-card-value">
                {String(counts.registered_faculty ?? 0)}
              </div>
            </Link>

            <Link
              to="/committee/faculty-roster"
              className="kpi-card kpi-card-link a07-kpi-accent-amber"
            >
              <div className="kpi-card-header">
                <span className="kpi-card-label">Unregistered Faculty</span>
              </div>
              <div className="kpi-card-value">
                {String(counts.unregistered_faculty ?? 0)}
              </div>
            </Link>

            <Link
              to="/committee/pending-records"
              className="kpi-card kpi-card-link a07-kpi-accent-blue"
            >
              <div className="kpi-card-header">
                <span className="kpi-card-label">
                  Pending Observation Records
                </span>
              </div>
              <div className="kpi-card-value">
                {String(counts.pending_observation_records ?? 0)}
              </div>
            </Link>

            <Link
              to="/committee/survey-tracking"
              className="kpi-card kpi-card-link a07-kpi-accent-red"
            >
              <div className="kpi-card-header">
                <span className="kpi-card-label">Missing Surveys</span>
              </div>
              <div className="kpi-card-value">
                {counts.surveys_open === false
                  ? "—"
                  : String(counts.missing_surveys ?? 0)}
              </div>
              {counts.surveys_open === false && (
                <p className="kpi-card-subtext">Surveys not open yet</p>
              )}
            </Link>
          </div>
        </section>
      )}

      {/* Phase 1 Section */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Phase 1</span>
          <h3>Registration & Observer Matching</h3>
        </div>

        <div className="reminder-banner">
          <p>
            <strong>Registration deadline:</strong>{" "}
            {cycle?.signup_deadline
              ? formatDate(String(cycle.signup_deadline))
              : "Loading..."}
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/faculty-matching">
              <img
                src={observer_selection_matching_card}
                alt="Observer Selection and Matching"
              />
              <h4>Observer Selection/Matching</h4>
              <p>
                Review automatically and manually-curated matched observer lists
              </p>
              <div className="a01-card-footer">
                <span className="card-status">
                  {Boolean(phases?.registration_closed)
                    ? "Registration period closed"
                    : "Registration period open"}
                </span>
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>

          <article className="dashboard-card a01-action-card">
            <Link to="/committee/unmatched-observees">
              <img
                src={unmatched_observees_card}
                alt="Unmatched Observees"
              />
              <h4>Unmatched Observees</h4>
              <p>
                Move any Observees with insufficient matched observer candidates
                to next semester's Due list
              </p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>

          <article className="dashboard-card a01-action-card">
            <Link to="/committee/faculty-roster">
              <img
                src={observation_record_management_card}
                alt="Observation Record Management"
              />
              <h4>Observation Record Management</h4>
              <p>
                Monitor course registrations and dispatch reminders to due or
                overdue faculty before the registration deadline
              </p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Phase 2 Section */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Phase 2</span>
          <h3>In-Progress Observations</h3>
        </div>

        <div className="reminder-banner">
          <p>
            <strong>Observation deadline:</strong>{" "}
            {cycle?.observation_deadline
              ? formatDate(String(cycle.observation_deadline))
              : "Loading..."}
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/pending-records">
              <img
                src={pending_observation_records_card}
                alt="Pending Observation Records"
              />
              <h4>Pending Observation Records</h4>
              <p>
                Remind observees and observers to submit signed records before
                the deadline.
              </p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Phase 3 Section */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Phase 3</span>
          <h3>Post-Observation Surveys and KPIs</h3>
        </div>

        <div className="reminder-banner">
          <p>
            <strong>Survey deadline:</strong>{" "}
            {cycle?.survey_deadline
              ? formatDate(String(cycle.survey_deadline))
              : "Loading..."}
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/survey-tracking">
              <img
                src={observation_surveys_card}
                alt="Observation Surveys"
              />
              <h4>Observation Surveys</h4>
              <p>
                Remind faculty members to complete their surveys before the
                deadline
              </p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>

          <article className="dashboard-card a01-action-card">
            <Link to="/committee/kpi-overview">
              <img src={kpis_card} alt="Generated KPIs" />
              <h4>Generated KPIs</h4>
              <p>View and download system-generated KPIs</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Form Management & Alerts Section */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Administration</span>
          <h3>Form Management and Alerts</h3>
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/form-editor">
              <img
                src={edit_form_card}
                alt="Edit Evaluation and Survey Forms"
              />
              <h4>Edit Evaluation/Survey Forms</h4>
              <p>
                Create, update or edit post-observation feedback survey forms
              </p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>

          {/* Scrollable Notification Card */}
          <article className="dashboard-card notification-card a01-alerts-card">
            <div className="a01-alerts-header">
              <h4>Alerts and Notifications</h4>
              {alerts && alerts.length > 0 && (
                <span className="alert-count-badge">{alerts.length}</span>
              )}
            </div>

            <div className="a01-alerts-scroll">
              {error && (
                <p className="signin-error-banner" role="alert">
                  {error}
                </p>
              )}

              {alerts?.length === 0 && (
                <p className="dashboard-notif-empty">
                  No outstanding committee alerts.
                </p>
              )}

              {alerts?.map((alert) => (
                <Link
                  key={alert.code}
                  to={alert.destination}
                  className="dashboard-notif-item"
                >
                  <p className="dashboard-notif-title fw-bold">
                    {alert.message}
                  </p>
                  <span className="dashboard-notif-link">View details</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}