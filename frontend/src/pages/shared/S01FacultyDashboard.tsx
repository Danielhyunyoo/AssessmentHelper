// src/pages/shared/S01FacultyDashboard.tsx
import { Link } from "react-router-dom";

import profile_and_evaluation_status_card from "../../assets/profile_and_evaluation_status_card.jpg"
import alerts_and_notifications_card from "../../assets/alerts_and_notifications_card.jpg"
import post_evaluation_survey_card from "../../assets/post_evaluation_survey_card.jpg"
import current_and_past_observations_card from "../../assets/current_and_past_observations_card.jpg"
import course_and_section_selection_card from "../../assets/course_and_section_selection_card.jpg"
import active_observations_card from "../../assets/active_observations_card.jpg";

export default function S01FacultyDashboard() {
  return (
    <div className="dashboard-container">

      <h2>Faculty Dashboard</h2>

      {/* General Modules Section */}
      <section className="dashboard-phase">
        <h3>General Modules</h3>

        <div className="card-grid">
          {/* Profile and Evaluation Status */}
          <article className="dashboard-card">
            <Link to="/shared/profile">
              <img src={profile_and_evaluation_status_card} alt="Profile and Evaluation Status" />
              <h4>Profile and Evaluation Status</h4>
              <p>View current status, hire level, due semester</p>
            </Link>
          </article>

          {/* Alerts and Notifications */}
          <article className="dashboard-card">
            <Link to="/shared/notifications">
              <img src={alerts_and_notifications_card} alt="Alerts and Notifications" />
              <h4>Alerts and Notifications</h4>
              <p>View status of any sent request(s), deadlines or more feedback</p>
            </Link>
          </article>

          {/* Post-Evaluation Survey */}
          <article className="dashboard-card">
            <Link to="/shared/post-evaluation-survey">
              <img src={post_evaluation_survey_card} alt="Post-Evaluation Survey" />
              <h4>Post-Evaluation Survey</h4>
              <p>Unlocks after the observation period ends (Nov 15)</p>
              <span className="card-status">LOCKED UNTIL NOV 15</span>
            </Link>
          </article>
        </div>
      </section>

      {/* Observee Modules Section */}
      <section className="dashboard-phase">
        <h3>Observee Modules</h3>

        <div className="card-grid">
          {/* Current and Past Observations */}
          <article className="dashboard-card">
            <Link to="/observee/current-past-observations">
              <img src={current_and_past_observations_card} alt="Current and Past Observations" />
              <h4>Current and Past Observations</h4>
              <p>View observation status</p>
            </Link>
          </article>

          {/* Course and Section Selection */}
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
          {/* Active Observations */}
          <article className="dashboard-card">
            <Link to="/observer/active-observations">
              <img src={active_observations_card} alt="Active Observations" />
              <h4>Active Observations</h4>
              <p>Upload forms and view confirmations</p>
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}