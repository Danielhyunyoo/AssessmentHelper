// src/pages/committee/A07KpiOverview.tsx
import { Link } from "react-router-dom";

export default function A07KpiOverview() {
  // Demo Data Definitions
  const facultyDue = 30;
  const overdueFaculty = 6;
  const incompleteRecords = 9;
  const unsignedRecords = 3;
  const completedRecords = 24;
  const unmatchedFaculty = 4;
  const completedProcessSignups = 18;

  const totalSignups = 24;
  const totalAssignedObservers = 22;
  const totalRecommendationsChecked = 35;
  const passedMatchingChecks = 31;
  const totalEligibleCandidates = 110;

  // Calculated Metrics
  const surveyCompletionPct = Math.round((completedProcessSignups / totalSignups) * 100);
  const participationPct = Math.round((totalSignups / facultyDue) * 100);
  const observerUtilizationPct = Math.round((totalAssignedObservers / totalSignups) * 100);
  const eligibilityPct = Math.round((passedMatchingChecks / totalRecommendationsChecked) * 100);
  const listSufficiencyRate = (totalEligibleCandidates / totalSignups).toFixed(1);

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2 className="kpi-page-title">Assessment KPI Overview</h2>

      {/* 1. Summary Cards Section */}
      <section className="dashboard-phase">
        <div className="table-container summary-card-padding">
          <h3 className="kpi-section-heading">Summary</h3>

          <div className="kpi-cards-grid">
            {/* Card 1: Faculty Due */}
            <Link to="/committee/faculty-roster" className="kpi-card kpi-card-link">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Faculty Due</span>
              </div>
              <div className="kpi-card-value">{facultyDue}</div>
              <p className="kpi-card-subtext">Due for evaluation at start of cycle</p>
            </Link>

            {/* Card 2: Overdue Faculty */}
            <Link to="/committee/faculty-roster" className="kpi-card kpi-card-link">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Overdue Faculty</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <polygon points="12,2 22,20 2,20" fill="#64748b" />
                  <text x="12" y="17" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    !
                  </text>
                </svg>
              </div>
              <div className="kpi-card-value">{overdueFaculty}</div>
              <p className="kpi-card-subtext">Marked overdue across cycles</p>
            </Link>

            {/* Card 3: Pending Records */}
            <Link to="/committee/pending-records" className="kpi-card kpi-card-link">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Pending Records</span>
              </div>
              <div className="kpi-card-value">{incompleteRecords + unsignedRecords}</div>
              <p className="kpi-card-subtext">Incomplete and/or waiting for faculty signatures</p>
            </Link>

            {/* Card 4: Unmatched Faculty */}
            <Link to="/committee/unmatched-observees" className="kpi-card kpi-card-link">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Unmatched Faculty</span>
              </div>
              <div className="kpi-card-value">{unmatchedFaculty}</div>
              <p className="kpi-card-subtext">Released lists with no eligible observers</p>
            </Link>

            {/* Card 5: Survey Completion % */}
            <Link to="/committee/survey-tracking" className="kpi-card kpi-card-link">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Survey Completion</span>
              </div>
              <div className="kpi-card-value">{surveyCompletionPct}%</div>
              <p className="kpi-card-subtext">
                {completedProcessSignups} out of {totalSignups} signups completed full process
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Rank Breakdowns Section */}
      <section className="dashboard-phase">
        <div className="table-container theme-green summary-card-padding">
          <h3 className="kpi-section-heading">Rank Breakdowns</h3>

          <div className="kpi-charts-grid">
            {/* Chart 1: Due vs. Overdue */}
            <div className="kpi-chart-card">
              <h4>Faculty Due vs. Overdue for Evaluation</h4>
              <p className="kpi-chart-subtitle">Split by Assistant, Associate, and Full Professors</p>

              <div className="rank-bar-group">
                {/* Assistant Professor */}
                <div className="rank-bar-item">
                  <div className="rank-bar-label-row">
                    <span>Assistant Professor</span>
                    <span>10 Due / 2 Overdue</span>
                  </div>
                  <div className="rank-progress-track">
                    <div className="rank-progress-fill-due" style={{ width: "80%" }}></div>
                    <div className="rank-progress-fill-overdue" style={{ width: "20%" }}></div>
                  </div>
                </div>

                {/* Associate Professor */}
                <div className="rank-bar-item">
                  <div className="rank-bar-label-row">
                    <span>Associate Professor</span>
                    <span>12 Due / 3 Overdue</span>
                  </div>
                  <div className="rank-progress-track">
                    <div className="rank-progress-fill-due" style={{ width: "75%" }}></div>
                    <div className="rank-progress-fill-overdue" style={{ width: "25%" }}></div>
                  </div>
                </div>

                {/* Full Professor */}
                <div className="rank-bar-item">
                  <div className="rank-bar-label-row">
                    <span>Full Professor</span>
                    <span>8 Due / 1 Overdue</span>
                  </div>
                  <div className="rank-progress-track">
                    <div className="rank-progress-fill-due" style={{ width: "88%" }}></div>
                    <div className="rank-progress-fill-overdue" style={{ width: "12%" }}></div>
                  </div>
                </div>
              </div>

              <div className="rank-bar-legend">
                <div className="legend-item">
                  <span className="legend-color-dot legend-dot-due"></span>
                  <span>Due</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-dot legend-dot-overdue"></span>
                  <span>Overdue</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Pending & Completed Observation Records Breakdown */}
            <div className="kpi-chart-card">
              <h4>Pending Observation Records</h4>
              <p className="kpi-chart-subtitle">Observation forms by status across faculty ranks</p>

              <div className="rank-bar-group">
                {/* Assistant Professor */}
                <div className="rank-bar-item">
                  <div className="rank-bar-label-row">
                    <span>Assistant Professor</span>
                    <span>4 Unfilled / 1 Unsigned / 8 Done</span>
                  </div>
                  <div className="rank-progress-track">
                    <div className="rank-progress-fill-unfilled" style={{ width: "31%" }}></div>
                    <div className="rank-progress-fill-unsigned" style={{ width: "8%" }}></div>
                    <div className="rank-progress-fill-completed" style={{ width: "61%" }}></div>
                  </div>
                </div>

                {/* Associate Professor */}
                <div className="rank-bar-item">
                  <div className="rank-bar-label-row">
                    <span>Associate Professor</span>
                    <span>3 Unfilled / 1 Unsigned / 10 Done</span>
                  </div>
                  <div className="rank-progress-track">
                    <div className="rank-progress-fill-unfilled" style={{ width: "21%" }}></div>
                    <div className="rank-progress-fill-unsigned" style={{ width: "7%" }}></div>
                    <div className="rank-progress-fill-completed" style={{ width: "72%" }}></div>
                  </div>
                </div>

                {/* Full Professor */}
                <div className="rank-bar-item">
                  <div className="rank-bar-label-row">
                    <span>Full Professor</span>
                    <span>2 Unfilled / 1 Unsigned / 6 Done</span>
                  </div>
                  <div className="rank-progress-track">
                    <div className="rank-progress-fill-unfilled" style={{ width: "22%" }}></div>
                    <div className="rank-progress-fill-unsigned" style={{ width: "11%" }}></div>
                    <div className="rank-progress-fill-completed" style={{ width: "67%" }}></div>
                  </div>
                </div>
              </div>

              <div className="rank-bar-legend">
                <div className="legend-item">
                  <span className="legend-color-dot legend-dot-unfilled"></span>
                  <span>Not Filled</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-dot legend-dot-unsigned"></span>
                  <span>Pending Signatures</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-dot legend-dot-completed"></span>
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Extra Process Metrics Section */}
      <section className="dashboard-phase">
        <div className="table-container theme-orange summary-card-padding">
          <h3 className="kpi-section-heading">Extra Process Metrics</h3>

          <div className="kpi-extra-metrics-grid">
            {/* Metric 1 */}
            <div className="extra-metric-card">
              <span className="extra-metric-title">Assessment Participation</span>
              <div className="extra-metric-value">{participationPct}%</div>
              <p className="extra-metric-formula">
                (Faculty who signed up / Faculty due for evaluation) × 100
              </p>
            </div>

            {/* Metric 2 */}
            <div className="extra-metric-card">
              <span className="extra-metric-title">Observer Utilization</span>
              <div className="extra-metric-value">{observerUtilizationPct}%</div>
              <p className="extra-metric-formula">
                (Unique assigned faculty / Faculty who signed up) × 100
              </p>
            </div>

            {/* Metric 3 */}
            <div className="extra-metric-card">
              <span className="extra-metric-title">Eligibility Rate</span>
              <div className="extra-metric-value">{eligibilityPct}%</div>
              <p className="extra-metric-formula">
                (Recommendations passing checks / Recommendations checked) × 100
              </p>
            </div>

            {/* Metric 4 */}
            <div className="extra-metric-card">
              <span className="extra-metric-title">List Sufficiency Rate</span>
              <div className="extra-metric-value">{listSufficiencyRate}</div>
              <p className="extra-metric-formula">
                Average eligible candidates available per signup (Target: ≥ 5.0)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Center Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}