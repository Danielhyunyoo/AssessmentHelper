// src/pages/committee/A07KPIOverview.tsx
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import { downloadKpiCsv } from "../../api/http";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

function splitKpiLabel(label: string): { code: string | null; title: string } {
  const match = label.match(/^(KPI-\d+)\s+(.+)$/i);
  if (match) {
    return { code: match[1].toUpperCase(), title: match[2] };
  }
  return { code: null, title: label };
}

export default function A07KpiOverview() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const [cycleId, setCycleId] = useState<number | undefined>(undefined);
  const [cycles, setCycles] = useState<
    { cycle_id: number; semester: string }[]
  >([]);

  useEffect(() => {
    async function loadKpis() {
      try {
        setLoading(true);
        setError("");

        const result = await committeeApi.kpis(cycleId);
        if (
          cycleId === undefined &&
          Array.isArray(result.historical_breakdown)
        ) {
          setCycles(
            result.historical_breakdown as {
              cycle_id: number;
              semester: string;
            }[]
          );
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
  const processCompletion = kpis.find(
    (kpi) => kpi.key === "process_completion"
  );
  const surveyCompletionDisplay = processCompletion
    ? formatKpi(processCompletion)
    : "N/A";

  const activeCycleLabel =
    cycles.find((c) => c.cycle_id === (cycleId ?? kpiData?.cycle?.id))
      ?.semester ?? kpiData?.cycle?.semester;

  const dueRanks =
    kpiData?.by_rank?.filter((rank: any) => rank.due + rank.overdue > 0) ?? [];
  const outstandingRanks =
    kpiData?.by_rank?.filter((rank: any) => rank.outstanding_records > 0) ?? [];
  const maxOutstanding = Math.max(
    1,
    ...outstandingRanks.map((r: any) => r.outstanding_records ?? 0)
  );

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    const element = reportRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1000,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        margin,
        contentWidth,
        Math.min(contentHeight, pdfHeight - margin * 2)
      );
      pdf.save("Assessment-KPI-Overview.pdf");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    }
  };

  // Print Handler
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Unified Page Header + Cycle Selector */}
      <div className="a07-page-header">
        <div className="a07-title-block">
          <div className="a02-section-title-group">
            <h2 className="a02-section-heading kpi-page-title">
              Assessment KPI Overview
            </h2>
            {activeCycleLabel && (
              <span className="status-chip a05-chip-info a04-nowrap-chip">
                {activeCycleLabel}
              </span>
            )}
          </div>
          <p className="a07-page-subtitle">
            Cycle progress, faculty participation metrics, and completion
            benchmarks.
          </p>
        </div>

        {cycles.length > 1 && (
          <div className="a07-cycle-control">
            <label htmlFor="a07-cycle-select" className="a07-cycle-label">
              Evaluation Cycle
            </label>
            <select
              id="a07-cycle-select"
              className="styled-select-input a07-cycle-select"
              value={cycleId ?? kpiData?.cycle?.id ?? ""}
              onChange={(event) => setCycleId(Number(event.target.value))}
            >
              {[...cycles].reverse().map((cycle) => (
                <option key={cycle.cycle_id} value={cycle.cycle_id}>
                  {cycle.semester}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Feedback States */}
      {loading && (
        <div className="a07-state-box">Loading assessment KPI data...</div>
      )}

      {error && (
        <div role="alert" className="yellow-banner">
          {error}
        </div>
      )}

      {!loading && !error && !kpiData && (
        <div className="a07-state-box">
          No KPI data is currently available for this cycle.
        </div>
      )}

      {/* Printable Report Wrapper */}
      {!loading && kpiData && (
        <div ref={reportRef} className="a07-report-stack">
          {/* 1. Summary Cards Section */}
          <section className="dashboard-phase">
            <div className="table-container summary-card-padding">
              <div className="a07-section-header">
                <h3 className="kpi-section-heading a02-zero-margin">Summary</h3>
                <span className="a07-section-hint">
                  Click any card to view detailed records
                </span>
              </div>

              <div className="kpi-cards-grid">
                {/* Card 1: Faculty Due */}
                <Link
                  to="/committee/faculty-roster"
                  className="kpi-card kpi-card-link a07-kpi-accent-blue"
                >
                  <div>
                    <div className="kpi-card-header">
                      <span className="kpi-card-label">Faculty Due</span>
                    </div>
                    <div className="kpi-card-value">{facultyDue}</div>
                  </div>
                  <p className="kpi-card-subtext">
                    Due for evaluation at start of cycle
                  </p>
                </Link>

                {/* Card 2: Overdue Faculty */}
                <Link
                  to="/committee/faculty-roster"
                  className={`kpi-card kpi-card-link ${
                    overdueFaculty > 0
                      ? "a07-kpi-accent-red"
                      : "a07-kpi-accent-slate"
                  }`}
                >
                  <div>
                    <div className="kpi-card-header">
                      <span className="kpi-card-label">Overdue Faculty</span>
                    </div>
                    <div className="kpi-card-value">{overdueFaculty}</div>
                  </div>
                  <p className="kpi-card-subtext">
                    Marked overdue across cycles
                  </p>
                </Link>

                {/* Card 3: Pending Records */}
                <Link
                  to="/committee/pending-records"
                  className="kpi-card kpi-card-link a07-kpi-accent-amber"
                >
                  <div>
                    <div className="kpi-card-header">
                      <span className="kpi-card-label">Pending Records</span>
                    </div>
                    <div className="kpi-card-value">{incompleteRecords}</div>
                  </div>
                  <p className="kpi-card-subtext">
                    Observation records awaiting completion
                  </p>
                </Link>

                {/* Card 4: Unmatched Faculty */}
                <Link
                  to="/committee/unmatched-observees"
                  className="kpi-card kpi-card-link a07-kpi-accent-amber"
                >
                  <div>
                    <div className="kpi-card-header">
                      <span className="kpi-card-label">Unmatched Faculty</span>
                    </div>
                    <div className="kpi-card-value">{unmatchedFaculty}</div>
                  </div>
                  <p className="kpi-card-subtext">
                    Released lists with no eligible observers
                  </p>
                </Link>

                {/* Card 5: Survey Completion % */}
                <Link
                  to="/committee/survey-tracking"
                  className="kpi-card kpi-card-link a07-kpi-accent-green"
                >
                  <div>
                    <div className="kpi-card-header">
                      <span className="kpi-card-label">Survey Completion</span>
                    </div>
                    <div className="kpi-card-value">
                      {surveyCompletionDisplay}
                    </div>
                  </div>
                  <p className="kpi-card-subtext">
                    {processCompletion?.numerator ?? 0} of{" "}
                    {processCompletion?.denominator ?? 0} signups completed the
                    full process
                  </p>
                </Link>
              </div>
            </div>
          </section>

          {/* 2. Rank Breakdowns Section */}
          <section className="dashboard-phase report-page-break">
            <div className="table-container theme-green summary-card-padding">
              <div className="a07-section-header">
                <h3 className="kpi-section-heading a02-zero-margin">
                  Rank Breakdowns
                </h3>
              </div>

              <div className="kpi-charts-grid">
                {/* Chart 1: Due vs. Overdue */}
                <div className="kpi-chart-card">
                  <h4>Faculty Due vs. Overdue for Evaluation</h4>
                  <p className="kpi-chart-subtitle">
                    Split by Assistant, Associate, and Full Professors
                  </p>

                  {dueRanks.length > 0 ? (
                    <div className="rank-bar-group">
                      {dueRanks.map((rank: any) => {
                        const total = (rank.due ?? 0) + (rank.overdue ?? 0);
                        const dueWidth =
                          total > 0 ? (rank.due / total) * 100 : 0;
                        const overdueWidth =
                          total > 0 ? (rank.overdue / total) * 100 : 0;

                        return (
                          <div className="rank-bar-item" key={rank.rank}>
                            <div className="rank-bar-label-row">
                              <span>{rank.rank}</span>
                              <span className="a07-rank-count-meta">
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
                  ) : (
                    <p className="a07-chart-empty">
                      No faculty due or overdue for this cycle.
                    </p>
                  )}

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

                {/* Chart 2: Pending Observation Records Breakdown */}
                <div className="kpi-chart-card">
                  <h4>Outstanding Observation Records by Rank</h4>
                  <p className="kpi-chart-subtitle">
                    Records awaiting completion after scheduled visits
                  </p>

                  {outstandingRanks.length > 0 ? (
                    <div className="rank-bar-group">
                      {outstandingRanks.map((rank: any) => {
                        const pct =
                          (rank.outstanding_records / maxOutstanding) * 100;

                        return (
                          <div className="rank-bar-item" key={rank.rank}>
                            <div className="rank-bar-label-row">
                              <span>{rank.rank}</span>
                              <span className="a07-rank-count-meta">
                                {rank.outstanding_records} Outstanding
                              </span>
                            </div>

                            <div className="rank-progress-track">
                              <div
                                className="rank-progress-fill-outstanding"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="a07-chart-empty">
                      No outstanding observation records for this cycle.
                    </p>
                  )}

                  <div className="rank-bar-legend">
                    <div className="legend-item">
                      <span className="legend-color-dot legend-dot-outstanding"></span>
                      <span>Outstanding Records</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Proposal KPIs Section */}
          <section className="dashboard-phase report-page-break">
            <div className="table-container theme-orange summary-card-padding">
              <div className="a07-section-header">
                <h3 className="kpi-section-heading a02-zero-margin">
                  Proposal KPIs
                </h3>
              </div>

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

          {/* 4. Definitions Section */}
          {kpis.length > 0 && (
            <section className="dashboard-phase">
              <div className="table-container summary-card-padding">
                <div className="a07-section-header">
                  <h3 className="kpi-section-heading a02-zero-margin">
                    KPI Definitions & Methodology
                  </h3>
                </div>

                <dl className="a07-definitions-list">
                  {kpis.map((kpi) => {
                    const { code, title } = splitKpiLabel(kpi.label);
                    return (
                      <div key={kpi.key} className="a07-definition-row">
                        <dt className="a07-definition-term">
                          {code && (
                            <span className="a07-kpi-code-badge">{code}</span>
                          )}
                          <span>{title}</span>
                        </dt>
                        <dd className="a07-definition-desc">
                          {kpi.definition}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Bottom Export & Report Actions */}
      <div className="kpi-export-actions-bottom">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadKpiCsv(kpiData?.cycle?.id)}
          disabled={loading || !kpiData}
        >
          Export KPI Report (CSV)
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void handleDownloadPdf()}
          disabled={loading || !kpiData}
        >
          Download PDF
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handlePrintPdf}
          disabled={loading || !kpiData}
        >
          Print Report
        </button>
      </div>

      {/* Bottom Center Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}