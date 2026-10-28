import { useState } from "react";
import { Link } from "react-router-dom";

export default function A02FacultyMatching() {
  const observeeList = ["Professor A", "Professor B", "Professor C"];
  const observerOptions = ["Professor D", "Professor E", "Professor F", "Professor G", "Professor H"];

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("2026-09-13");
  const [endDate, setEndDate] = useState<string>("2026-10-09");
  const [displayStartDate, setDisplayStartDate] = useState<string>("Sep 13, 2026");
  const [displayEndDate, setDisplayEndDate] = useState<string>("Oct 9, 2026 at 11:59 PM");

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleSaveDates = () => {
    const fullStartDateTime = `${startDate}T00:00`;
    const fullEndDateTime = `${endDate}T23:59`;

    const startObj = new Date(fullStartDateTime);
    const endObj = new Date(fullEndDateTime);

    if (!isNaN(startObj.getTime()) && !isNaN(endObj.getTime())) {
      setDisplayStartDate(
        startObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
      setDisplayEndDate(
        endObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
          " at 11:59 PM"
      );
    }

    setIsModalOpen(false);
  };

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection and Matching</h2>

      {/* Top Banner Card */}
      <section className="table-container theme-orange" style={{ padding: "1.5rem" }}>
        <h3>Manage Course Registrations</h3>
        <p style={{ marginTop: "0.5rem" }}>
          <strong>Current Status:</strong> 🟢 COURSE REGISTRATION CURRENTLY OPEN <br />
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            (Open from {displayStartDate} until {displayEndDate})
          </span>
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          <strong>Next Scheduled Action:</strong> Auto-Lock Course Registrations and Generate Matches on Oct 10, 2026
        </p>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: "1rem" }}
          onClick={handleOpenModal}
        >
          Edit Course Registration Dates
        </button>
      </section>

      {/* Manual Matching */}
      <section className="dashboard-phase" style={{ marginTop: "1rem" }}>
        <h3>Manual Observer-Observee Matching</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> The following Observees have either 0 or insufficient Observers currently matched to them. Please ensure each Observee has 5 Observers assigned. Manually select eligible Observers from the dropdowns below.
        </div>

        <div className="table-container theme-green" style={{ padding: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {observeeList.map((obs, idx) => (
              <div key={idx} style={{ backgroundColor: "#fff7ed", padding: "1rem", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                <h4>Observee Name</h4>
                <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.75rem" }}>{obs}</p>

                <strong>List of Available Observers</strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {[1, 2, 3, 4, 5].map((slot) => (
                    <select key={slot} style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                      <option value="">Select observer {slot}...</option>
                      {observerOptions.map((o, i) => (
                        <option key={i} value={o}>{o}</option>
                      ))}
                    </select>
                  ))}
                </div>

                <button type="button" className="btn-secondary btn-block" style={{ marginTop: "1rem" }}>
                  Confirm Matches
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Review & Approve */}
      <section className="dashboard-phase">
        <h3>Review and Approve Existing Observer-Observee Matched Lists</h3>

        <div className="yellow-banner">
          <strong>NOTE:</strong> Course registration closed on October 9. Below are the system-generated matched observer lists ready for review, manual override, and notification dispatch to Observees.
        </div>

        <div className="table-container theme-blue" style={{ padding: "1.25rem" }}>
          <p style={{ marginBottom: "1rem", fontWeight: "600" }}>
            Review the following completed matched lists. Select each Observee you'd like to notify about their successful matches:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {["Professor D", "Professor E", "Professor F"].map((obsName, idx) => (
              <div key={idx} style={{ backgroundColor: "#f0fdf4", padding: "1rem", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                <h4>Observee Name</h4>
                <p style={{ fontSize: "0.9rem", color: "#64748b" }}>{obsName}</p>
                <span style={{ fontSize: "0.8rem", color: "#15803d", fontWeight: "700" }}>CS 4349.002</span>

                <strong style={{ display: "block", marginTop: "0.75rem" }}>List of Matched Observers</strong>
                <ul style={{ paddingLeft: "1.25rem", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  {observerOptions.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>

                <button type="button" className="btn-primary btn-block" style={{ marginTop: "1rem" }}>
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls Bar - Using standardized grey toggle buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn-select-toggle">Select All</button>
            <button type="button" className="btn-select-toggle">Deselect All</button>
          </div>

          <button type="button" className="btn-primary">Send Notifications</button>
        </div>

        {/* Bottom Centered Return Button */}
        <div className="dashboard-center-action">
          <Link to="/committee/dashboard" className="btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </section>

      {/* Date Control Modal Popup */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Course Registration Dates</h3>

            <div className="modal-field">
              <label htmlFor="reg-opens">
                Registration opens <span style={{ fontSize: "0.8rem", color: "#64748b" }}>(12:00 AM fixed)</span>
              </label>
              <input
                id="reg-opens"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-closes">
                Registration closes <span style={{ fontSize: "0.8rem", color: "#64748b" }}>(11:59 PM fixed)</span>
              </label>
              <input
                id="reg-closes"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-btn-secondary" onClick={handleCloseModal}>
                Close
              </button>
              <button type="button" className="modal-btn-primary" onClick={handleSaveDates}>
                Save Dates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}