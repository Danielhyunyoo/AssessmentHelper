// src/pages/committee/A01CommitteeDashboard.tsx
import { useEffect, useState } from "react";
import { committeeApi, facultyApi } from "../../api/endpoints";
import { formatDate } from "../../api/format";
import { Link } from "react-router-dom";
import CycleModuleGuideBanner from "../../components/CycleModuleGuideBanner";
import {
  COMMITTEE_MODULES_GUIDE,
  COMMITTEE_OVERALL_BRIEF,
} from "../../data/moduleGuides";

import observer_selection_matching_card from "../../assets/card-stock-images/observer_selection_matching_card.jpg";
import unmatched_observees_card from "../../assets/card-stock-images/unmatched_observees_card.jpg";
import observation_record_management_card from "../../assets/card-stock-images/observation_record_management_card.jpg";
import current_and_past_observations_card from "../../assets/card-stock-images/current_and_past_observations_card.jpg";
import alerts_and_notifications_card from "../../assets/card-stock-images/alerts_and_notifications_card.jpg";
import profile_and_evaluation_status_card from "../../assets/card-stock-images/profile_and_evaluation_status_card.jpg";
import course_and_section_selection_card from "../../assets/card-stock-images/course_and_section_selection_card.jpg";

interface CommitteeDashboardData {
  cycle?: {
    id?: number;
    name?: string;
    start_date?: string;
    end_date?: string;
    signup_deadline?: string;
    observation_deadline?: string;
    survey_deadline?: string;
  };
  metrics?: {
    active_observees_count: number;
    active_observers_count: number;
    unmatched_observees_count: number;
    pending_observations_count: number;
    completed_surveys_count: number;
  };
}

interface CycleDatesSummary {
  signup_deadline?: string;
  observation_deadline?: string;
  survey_deadline?: string;
  end_date?: string;
}

export default function A01CommitteeDashboard() {
  const [dashboard, setDashboard] = useState<CommitteeDashboardData | null>(
    null
  );
  const [cycleDates, setCycleDates] = useState<CycleDatesSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, regData] = await Promise.all([
        committeeApi.dashboard() as Promise<CommitteeDashboardData>,
        facultyApi.registrationStatus().catch(() => null),
      ]);
      setDashboard(data);
      if (regData) {
        setCycleDates(regData as CycleDatesSummary);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load committee dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = dashboard?.metrics;

  const signupDeadlineLabel = (() => {
    const raw =
      dashboard?.cycle?.signup_deadline || cycleDates?.signup_deadline;
    return raw ? formatDate(raw) : "the registration cutoff";
  })();

  const observationDeadlineLabel = (() => {
    const raw =
      dashboard?.cycle?.observation_deadline ||
      cycleDates?.observation_deadline;
    return raw ? formatDate(raw) : "Nov 30";
  })();

  const surveyDeadlineLabel = (() => {
    const raw =
      dashboard?.cycle?.survey_deadline || cycleDates?.survey_deadline;
    return raw ? formatDate(raw) : "Dec 10";
  })();

  return (
    <div className="dashboard-container">
      {/* Page Title and Active Cycle */}
      <div className="a01-page-header">
        <div>
          <h2>Assessment Committee Dashboard</h2>
          <p className="s01-subtitle">
            Monitor cycle progress, manage observer pairings, and audit
            evaluation records.
          </p>
        </div>

        {dashboard?.cycle?.name && (
          <span className="a01-cycle-badge">
            Active Cycle: {dashboard.cycle.name}
          </span>
        )}
      </div>

      {/* Collapsible Detailed Module Guide */}
      <CycleModuleGuideBanner
        storageKey="a01_committee_module_guide_open"
        eyebrow="Committee Operations Guide"
        title="How Each Assessment Committee Module Works"
        overview={COMMITTEE_OVERALL_BRIEF}
        modules={COMMITTEE_MODULES_GUIDE}
        defaultOpen={false}
      />

      {loading && (
        <div className="a07-state-box">Loading cycle metrics...</div>
      )}

      {error && (
        <p className="signin-error-banner" role="alert">
          {error}
        </p>
      )}

      {/* High-Priority Action Alert */}
      {metrics && metrics.unmatched_observees_count > 0 && (
        <div className="yellow-banner a01-alert-banner" role="status">
          <span>
            <strong>Action Needed:</strong>{" "}
            {metrics.unmatched_observees_count} observee(s) currently require
            matching attention before the signup cutoff ({signupDeadlineLabel}).
          </span>
          <Link to="/committee/unmatched-observees" className="a01-banner-link">
            Review Unmatched →
          </Link>
        </div>
      )}

      {/* Live Cycle KPI Summary Bar */}
      {metrics && (
        <div className="a01-kpi-grid">
          <Link to="/committee/faculty-roster" className="a01-kpi-card">
            <span className="a01-kpi-label">Active Observees</span>
            <span className="a01-kpi-value">
              {metrics.active_observees_count}
            </span>
            <span className="a01-kpi-hint">View faculty roster</span>
          </Link>

          <Link to="/committee/faculty-roster" className="a01-kpi-card">
            <span className="a01-kpi-label">Active Observers</span>
            <span className="a01-kpi-value">
              {metrics.active_observers_count}
            </span>
            <span className="a01-kpi-hint">Eligible peer pool</span>
          </Link>

          <Link
            to="/committee/unmatched-observees"
            className={`a01-kpi-card ${
              metrics.unmatched_observees_count > 0 ? "is-warning" : ""
            }`}
          >
            <span className="a01-kpi-label">Unmatched Observees</span>
            <span className="a01-kpi-value">
              {metrics.unmatched_observees_count}
            </span>
            <span className="a01-kpi-hint">
              {metrics.unmatched_observees_count > 0
                ? "Needs assignment"
                : "All matched"}
            </span>
          </Link>

          <Link to="/committee/pending-records" className="a01-kpi-card">
            <span className="a01-kpi-label">Pending Records</span>
            <span className="a01-kpi-value">
              {metrics.pending_observations_count}
            </span>
            <span className="a01-kpi-hint">In-progress or unsigned</span>
          </Link>

          <Link to="/committee/survey-tracking" className="a01-kpi-card">
            <span className="a01-kpi-label">Completed Surveys</span>
            <span className="a01-kpi-value">
              {metrics.completed_surveys_count}
            </span>
            <span className="a01-kpi-hint">Post-observation feedback</span>
          </Link>
        </div>
      )}

      {/* Phase 1 */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Phase 1</span>
          <h3>Matching and Roster Setup</h3>
        </div>

        <div className="yellow-banner" role="status">
          <strong>Phase 1 Deadline ({signupDeadlineLabel}):</strong> Approve
          faculty course signups, release matched observer lists, and follow up
          with unregistered or unmatched faculty before{" "}
          <strong>{signupDeadlineLabel}</strong>.
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/faculty-matching">
              <img
                src={observer_selection_matching_card}
                alt="Observer Selection and Matching"
              />
              <h4>Observer Selection and Matching</h4>
              <p>Review or edit observer candidates and pairings</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Manage Pairings →</span>
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
              <p>View or edit unmatched observees</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Review List →</span>
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
              <p>View active and non-active users and remind them</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open Roster →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Phase 2 */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Phase 2</span>
          <h3>Observation Execution</h3>
        </div>

        <div className="yellow-banner" role="status">
          <strong>Phase 2 Deadline ({observationDeadlineLabel}):</strong> Track
          ongoing classroom visits and verify that both observer and observee
          signatures are completed by{" "}
          <strong>{observationDeadlineLabel}</strong>.
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/pending-records">
              <img
                src={current_and_past_observations_card}
                alt="Pending Observation Records"
              />
              <h4>Pending Observation Records</h4>
              <p>View pending observation records and signatures</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Inspect Records →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Phase 3 */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Phase 3</span>
          <h3>Surveys and Cycle Analytics</h3>
        </div>

        <div className="yellow-banner" role="status">
          <strong>Phase 3 Deadline ({surveyDeadlineLabel}):</strong> Monitor
          post-observation survey responses due by{" "}
          <strong>{surveyDeadlineLabel}</strong> and export cycle KPI reports
          once evaluations wrap up.
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/survey-tracking">
              <img
                src={alerts_and_notifications_card}
                alt="Observation Surveys"
              />
              <h4>Observation Surveys</h4>
              <p>View post-observation survey statuses</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Track Surveys →</span>
              </div>
            </Link>
          </article>

          <article className="dashboard-card a01-action-card">
            <Link to="/committee/kpi-overview">
              <img
                src={profile_and_evaluation_status_card}
                alt="Generated KPIs"
              />
              <h4>Generated KPIs</h4>
              <p>View KPIs and download cycle summary</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">View Analytics →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Admin */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Admin</span>
          <h3>Form and Template Configuration</h3>
        </div>

        <div className="yellow-banner" role="status">
          <strong>Admin Note:</strong> Active evaluation rubrics and surveys
          lock automatically once responses are submitted. Clone a template
          before the next cycle begins to prepare edits.
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/committee/form-editor">
              <img
                src={course_and_section_selection_card}
                alt="Edit Evaluation and Survey Forms"
              />
              <h4>Edit Evaluation and Survey Forms</h4>
              <p>Edit rubric templates and survey questions</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Configure Forms →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}