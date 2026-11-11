// src/pages/committee/A07KpiOverview.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import { downloadKpiCsv } from "../../api/http";

export default function A07KpiOverview() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadKpis() {
      try {
        setLoading(true);
        setError("");

        const result = await committeeApi.kpis();
        setKpiData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load KPI data."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadKpis();
  }, []);

  const counts = kpiData?.counts;

  const facultyDue = counts?.due ?? 0;

  const overdueFaculty = counts?.overdue ?? 0;
  const incompleteRecords = counts?.outstanding_records ?? 0;
  const unmatchedFaculty = counts?.unmatched ?? 0;

  const surveyCompletionDisplay =
    counts?.survey_completion_percent == null
      ? "N/A"
      : `${counts.survey_completion_percent}%`;

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2 className="kpi-page-title">Assessment KPI Overview</h2>
      <div className="dashboard-center-action">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadKpiCsv(kpiData?.cycle?.id)}
          disabled={loading || !kpiData}
        >
          Export KPI Report (CSV)
        </button>
      </div>

      {loading && <p>Loading KPI data...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && !kpiData && (
        <p>No KPI data is currently available.</p>
      )}

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
              <div className="kpi-card-value">{incompleteRecords}</div>
              <p className="kpi-card-subtext">
                Outstanding observation records awaiting completion
              </p>
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
              <div className="kpi-card-value">{surveyCompletionDisplay}</div>
              <p className="kpi-card-subtext">
                {counts?.submitted_surveys ?? 0} out of{" "}
                {counts?.expected_surveys ?? 0} required surveys submitted
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
                {kpiData?.by_rank?.map((rank: any) => {
                  const total = rank.due + rank.overdue;
                  const dueWidth = total > 0 ? (rank.due / total) * 100 : 0;
                  const overdueWidth = total > 0 ? (rank.overdue / total) * 100 : 0;

                  return (
                    <div className="rank-bar-item" key={rank.rank}>
                      <div className="rank-bar-label-row">
                        <span>{rank.rank}</span>
                        <span>
                          {rank.due} Due / {rank.overdue} Overdue
                        </span>
                      </div>

                      <div className="rank-progress-track">
                        <div
                          className="rank-progress-fill-due"
                          style={{ width: `${dueWidth}%` }}
                        />
                        <div
                          className="rank-progress-fill-overdue"
                          style={{ width: `${overdueWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
              <h4>Outstanding Observation Records by Rank</h4>
              <p className="kpi-chart-subtitle">
                Records awaiting completion after scheduled visits
              </p>

              <div className="rank-bar-group">
                {kpiData?.by_rank?.map((rank: any) => (
                  <div className="rank-bar-item" key={rank.rank}>
                    <div className="rank-bar-label-row">
                      <span>{rank.rank}</span>
                      <span>{rank.outstanding_records} Outstanding</span>
                    </div>
                  </div>
                ))}
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
            <div className="extra-metric-card">
              <span className="extra-metric-title">Survey Completion</span>
              <div className="extra-metric-value">
                <div className="extra-metric-value">{surveyCompletionDisplay}</div>
              </div>
              <p className="extra-metric-formula">
                Submitted surveys divided by expected surveys
              </p>
            </div>

            <div className="extra-metric-card">
              <span className="extra-metric-title">Outstanding Records</span>
              <div className="extra-metric-value">
                {counts?.outstanding_records ?? 0}
              </div>
              <p className="extra-metric-formula">
                Confirmed observations still awaiting completed records
              </p>
            </div>

            <div className="extra-metric-card">
              <span className="extra-metric-title">Missing Surveys</span>
              <div className="extra-metric-value">
                {counts?.missing_surveys ?? 0}
              </div>
              <p className="extra-metric-formula">
                Expected surveys that have not been submitted
              </p>
            </div>
          </div>
        </div>
      </section>

      {kpiData?.limitations?.length > 0 && (
        <section className="dashboard-phase">
          <div className="table-container summary-card-padding">
            <h3 className="kpi-section-heading">Reporting Notes</h3>

            <ul>
              {kpiData.limitations.map((limitation: string, index: number) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Bottom Center Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}