// src/pages/committee/A01CommitteeDashboard.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import observer_selection_matching_card from "../../assets/observer_selection_matching_card.jpg";
import unmatched_observees_card from "../../assets/unmatched_observees_card.jpg";
import observation_record_management_card from "../../assets/observation_record_management_card.jpg";
import pending_observation_records_card from "../../assets/pending_observation_records_card.jpg";
import observation_surveys_card from "../../assets/observation_surveys_card.jpg";
import kpis_card from "../../assets/kpis_card.jpg";
import edit_form_card from "../../assets/edit_form_card.jpg";

interface NotificationItem {
  id: string | number;
  title: string;
  time: string;
  unread: boolean;
}

export default function A01CommitteeDashboard() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      title: "2 OBSERVEES have found 0 eligible OBSERVER matches",
      time: "October 26, 2026",
      unread: true,
    },
    {
      id: 2,
      title: "Faculty Roster deadline reminder updated for Fall 2026 cycle.",
      time: "October 24, 2026",
      unread: false,
    },
    {
      id: 3,
      title: "New evaluation form version draft V2 is saved and ready for review.",
      time: "October 20, 2026",
      unread: false,
    },
  ]);

  const handleNotificationClick = (id: string | number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    if (id === 1) {
      navigate("/committee/unmatched-observees");
    }
  };

  return (
    <div className="dashboard-container">
      <h2>Assessment Committee Dashboard</h2>

      {/* Phase 1 Section */}
      <section className="dashboard-phase">
        <h3>Phase 1: Registration & Observer Matching</h3>
        <div className="reminder-banner">
          <p>
            <strong>REMINDER:</strong> The last day for Observer course registration is Oct. 9. Observers will be notified about their generated matched lists after this day.
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/committee/faculty-matching">
              <img src={observer_selection_matching_card} alt="Observer Selection and Matching" />
              <h4>Observer Selection/Matching</h4>
              <p>Review automatically and manually-curated matched observer lists</p>
              <span className="card-status">MODULE UNLOCKS AFTER SIGN-UP DEADLINE PASSES</span>
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
            <strong>REMINDER:</strong> Classroom observations and dual-signed evaluation records must be submitted by Nov 15.
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
            <strong>REMINDER:</strong> All Observer/Observee surveys must be completed by Dec 1.
          </p>
        </div>

        <div className="card-grid">
          <article className="dashboard-card">
            <Link to="/committee/survey-tracking">
              <img src={observation_surveys_card} alt="Observation Surveys" />
              <h4>Observation Surveys</h4>
              <p>Remind faculty members to complete their surveys before the deadline</p>
              <span className="card-status">MODULE UNLOCKS AFTER NOV 15 DEADLINE</span>
            </Link>
          </article>

          <article className="dashboard-card">
            <Link to="/committee/kpi-overview">
              <img src={kpis_card} alt="Generated KPIs" />
              <h4>Generated KPIs</h4>
              <p>View and download system-generated KPIs</p>
              <span className="card-status">FULL MODULE CONTENT AVAILABLE AFTER DEC 1 DEADLINE</span>
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
            
            <div className="dashboard-notifications-container">
              {notifications.length === 0 ? (
                <div className="dashboard-notif-empty">
                  No new notifications right now.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n.id)}
                    className={`menu-item-hover dashboard-notif-item ${n.unread ? "notif-unread-highlight" : "notif-read-item"}`}
                  >
                    <p className={`dashboard-notif-title ${n.unread ? "fw-bold" : "fw-medium"}`}>{n.title}</p>
                    <span className={`dashboard-notif-time ${n.unread ? "text-success-green" : "text-muted-gray"}`}>{n.time}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}