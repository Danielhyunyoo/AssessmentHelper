// src/pages/committee/A01CommitteeDashboard.tsx
import { Link } from "react-router-dom";
import homeIcon from "../../assets/home_icon.png"; // Make sure home_icon.png is inside src/assets/

export default function A01CommitteeDashboard() {
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
          {/* Card 1 */}
          <article className="dashboard-card">
            <Link to="/committee/observer-matching">
              <img src="/placeholder-observer-matching.png" alt="Observer Selection and Matching" />
              <h4>Observer Selection/Matching</h4>
              <p>Review automatically and manually-curated matched observer lists</p>
              <span className="card-status">MODULE UNLOCKS AFTER SIGN-UP DEADLINE PASSES</span>
            </Link>
          </article>

          {/* Card 2 */}
          <article className="dashboard-card">
            <Link to="/committee/unmatched-observees">
              <img src="/placeholder-unmatched.png" alt="Unmatched Observees" />
              <h4>Unmatched Observees</h4>
              <p>Move any Observees with insufficient matched observer candidates to next semester's Due list</p>
            </Link>
          </article>

         {/* Card 3 */}
          <article className="dashboard-card">
            <Link to="/committee/faculty-roster">
              <img src="/placeholder-record-management.png" alt="Observation Record Management" />
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
          {/* Card 1 */}
          <article className="dashboard-card">
            <Link to="/committee/pending-records">
              <img src="/placeholder-pending-records.png" alt="Pending Observation Records" />
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
          {/* Card 1 */}
          <article className="dashboard-card">
            <Link to="/committee/survey-tracking">
              <img src="/placeholder-surveys.png" alt="Observation Surveys" />
              <h4>Observation Surveys</h4>
              <p>Remind faculty members to complete their surveys before the deadline</p>
              <span className="card-status">MODULE UNLOCKS AFTER NOV 15 DEADLINE</span>
            </Link>
          </article>

          {/* Card 2 */}
          <article className="dashboard-card">
            <Link to="/committee/kpi-overview">
              <img src="/placeholder-kpis.png" alt="Generated KPIs" />
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
          {/* Card 1 */}
          <article className="dashboard-card">
            <Link to="/committee/form-editor">
              <img src="/placeholder-form-editor.png" alt="Edit Evaluation and Survey Forms" />
              <h4>Edit Evaluation/Survey Forms</h4>
              <p>Create, update or edit post-observation feedback survey forms</p>
            </Link>
          </article>

          {/* Card 2: Notifications Widget */}
          <article className="dashboard-card notification-card">
            <h4>Alerts and Notifications</h4>
            <ul>
              <li>2 OBSERVEES have found 0 eligible OBSERVER matches</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}