// src/pages/committee/A07KpiOverview.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import { downloadKpiCsv } from "../../api/http";

interface ProposalKpi {
  key: string;
  label: string;
  definition: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  unit: "percent" | "average" | "count";
  note?: string;
}

function formatKpi(kpi: ProposalKpi) {
  if (kpi.value == null) return kpi.note || "N/A";
  if (kpi.unit === "percent") return `${kpi.value}%`;
  return String(kpi.value);
}

function kpiBasis(kpi: ProposalKpi) {
  if (kpi.numerator == null || kpi.denominator == null) return "";
  return kpi.unit === "average"
    ? `${kpi.numerator} eligible candidates across ${kpi.denominator} released lists`
    : `${kpi.numerator} of ${kpi.denominator}`;
}

export default function A07KpiOverview() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cycleId, setCycleId] = useState<number | undefined>(undefined);
  const [cycles, setCycles] = useState<{ cycle_id: number; semester: string }[]>([]);

  useEffect(() => {
    async function loadKpis() {
      try {
        setLoading(true);
        setError("");

        const result = await committeeApi.kpis(cycleId);
        if (cycleId === undefined && Array.isArray(result.historical_breakdown)) {
          setCycles(result.historical_breakdown as { cycle_id: number; semester: string }[]);
        }
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
  }, [cycleId]);

  const counts = kpiData?.counts;

  const facultyDue = counts?.due ?? 0;

  const overdueFaculty = counts?.overdue ?? 0;
  const incompleteRecords = counts?.outstanding_records ?? 0;
  const unmatchedFaculty = counts?.unmatched ?? 0;

  const kpis: ProposalKpi[] = kpiData?.kpis ?? [];
  const processCompletion = kpis.find((kpi) => kpi.key === "process_completion");
  const surveyCompletionDisplay = processCompletion ? formatKpi(processCompletion) : "N/A";

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
        {cycles.length > 1 && (
          <label>
            Cycle:{" "}
            <select
              value={cycleId ?? kpiData?.cycle?.id ?? ""}
              onChange={(event) => setCycleId(Number(event.target.value))}
            >
              {[...cycles].reverse().map((cycle) => (
                <option key={cycle.cycle_id} value={cycle.cycle_id}>
                  {cycle.semester}
                </option>
              ))}
            </select>
          </label>
        )}
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
                Observation records awaiting completion
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
                {processCompletion?.numerator ?? 0} out of{" "}
                {processCompletion?.denominator ?? 0} signups completed the full process
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
                {kpiData?.by_rank?.filter((rank: any) => rank.due + rank.overdue > 0).map((rank: any) => {
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
                {kpiData?.by_rank?.filter((rank: any) => rank.outstanding_records > 0).map((rank: any) => (
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
            {kpis.map((kpi) => (
              <div className="extra-metric-card" key={kpi.key}>
                <span className="extra-metric-title">{kpi.label}</span>
                <div className="extra-metric-value">{formatKpi(kpi)}</div>
                <p className="extra-metric-formula">{kpiBasis(kpi)}</p>
              </div>
            ))}
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

      {kpis.length > 0 && (
        <section className="dashboard-phase">
          <div className="table-container summary-card-padding">
            <h3 className="kpi-section-heading">Definitions</h3>

            <dl>
              {kpis.map((kpi) => (
                <div key={kpi.key}>
                  <dt><strong>{kpi.label}</strong></dt>
                  <dd>{kpi.definition}</dd>
                </div>
              ))}
            </dl>
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