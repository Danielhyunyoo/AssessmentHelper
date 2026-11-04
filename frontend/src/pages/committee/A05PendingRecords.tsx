import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type AcademicRank =
  | "Assistant Professor"
  | "Associate Professor"
  | "Full Professor"
  | "Professor of Instruction";

interface PendingCandidate {
  id: string;
  candidateName: string;
  department: string;
  academicLevel: AcademicRank;
  observerName: string;
  courseAndSection: string;
  observationDate: string;
  observationTime: string;
  location: string;
}

interface CompletedRecord {
  id: string;
  candidateName: string;
  department: string;
  academicLevel: AcademicRank;
  observerName: string;
  courseAndSection: string;
  observationDate: string;
  observationTime: string;
  location: string;
  dateFinalized: string;
}

export default function A05PendingObservationRecords() {
  const navigate = useNavigate();

  // Selection state for Candidates needing reminders
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  // Alert Feedback Banner State
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State for Selected Candidate Details (Pending or Completed)
  const [selectedCandidateDetails, setSelectedCandidateDetails] =
    useState<PendingCandidate | CompletedRecord | null>(null);

  // Sample Pending Data
  const [pendingList] = useState<PendingCandidate[]>([
    {
      id: "p1",
      candidateName: "Professor A",
      department: "Computer Science",
      academicLevel: "Full Professor",
      observerName: "Dr. Smith",
      courseAndSection: "CS 4337.001",
      observationDate: "10/12/2026",
      observationTime: "10:00 AM - 11:15 AM",
      location: "ECSS 2.410",
    },
    {
      id: "p2",
      candidateName: "Professor B",
      department: "Computer Science",
      academicLevel: "Full Professor",
      observerName: "Dr. Johnson",
      courseAndSection: "CS 3345.003",
      observationDate: "10/14/2026",
      observationTime: "01:00 PM - 02:15 PM",
      location: "ECSN 1.202",
    },
    {
      id: "p3",
      candidateName: "Professor C",
      department: "Computer Science",
      academicLevel: "Associate Professor",
      observerName: "Dr. Williams",
      courseAndSection: "CS 1336.002",
      observationDate: "10/18/2026",
      observationTime: "08:30 AM - 09:45 AM",
      location: "ECSS 2.311",
    },
  ]);

  // Sample Completed Data (Matches A06 Table Structure)
  const [completedList] = useState<CompletedRecord[]>([
    {
      id: "c1",
      candidateName: "Professor E",
      department: "Computer Science",
      academicLevel: "Full Professor",
      observerName: "Dr. Smith",
      courseAndSection: "CS 4349.002",
      observationDate: "10/13/2026",
      observationTime: "01:00 PM - 02:15 PM",
      location: "ECSS 2.410",
      dateFinalized: "10/22/2026",
    },
    {
      id: "c2",
      candidateName: "Professor F",
      department: "Electrical Engineering",
      academicLevel: "Assistant Professor",
      observerName: "Dr. Johnson",
      courseAndSection: "EE 3302.001",
      observationDate: "10/15/2026",
      observationTime: "10:00 AM - 11:15 AM",
      location: "ECSN 1.202",
      dateFinalized: "10/24/2026",
    },
    {
      id: "c3",
      candidateName: "Professor G",
      department: "Mechanical Engineering",
      academicLevel: "Full Professor",
      observerName: "Dr. Williams",
      courseAndSection: "MECH 2310.001",
      observationDate: "10/20/2026",
      observationTime: "02:30 PM - 03:45 PM",
      location: "ECSS 2.311",
      dateFinalized: "10/25/2026",
    },
  ]);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    setSelectedCandidates(pendingList.map((c) => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedCandidates([]);
  };

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Modal Handlers
  const handleOpenDetailsModal = (candidate: PendingCandidate | CompletedRecord) => {
    setSelectedCandidateDetails(candidate);
  };

  const handleCloseDetailsModal = () => {
    setSelectedCandidateDetails(null);
  };

  // Send Notification Action
  const handleSendNotifications = () => {
    if (selectedCandidates.length === 0) {
      alert("Please select at least one professor to send a reminder notification.");
      return;
    }

    setFeedbackMessage(
      `Reminder notifications sent to ${selectedCandidates.length} candidate(s).`
    );
    setSelectedCandidates([]);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Return to Dashboard
        </Link>
      </div>

      <h2>View Pending Observation Records</h2>

      {/* Success/Action Feedback Banner */}
      {feedbackMessage ? (
        <div role="status" className="yellow-banner">
          <strong>Success:</strong> {feedbackMessage}
        </div>
      ) : (
        /* Default Page Reminder Banner */
        <div className="yellow-banner">
          <strong>REMINDER:</strong> Faculty members have until Nov 15 to sign and submit their Evaluation Records.
        </div>
      )}

      {/* SECTION 1: PENDING EVALUATION FORMS */}
      <section className="dashboard-phase">
        <h3>Pending Evaluation Forms</h3>

        {/* Blue Theme Table Box Container */}
        <div className="table-container theme-blue">
          <div className="table-instruction">
            Select a Professor's name to remind them to complete their Evaluation Form.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th className="col-checkbox">Select</th>
                  <th>Candidate Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th className="align-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((candidate) => {
                  const isSelected = selectedCandidates.includes(candidate.id);
                  return (
                    <tr key={candidate.id}>
                      <td className="align-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCandidate(candidate.id)}
                          aria-label={`Select ${candidate.candidateName}`}
                        />
                      </td>
                      <td className="font-semibold">{candidate.candidateName}</td>
                      <td>{candidate.department}</td>
                      <td>{candidate.academicLevel}</td>
                      <td className="align-center">
                        <button
                          type="button"
                          className="table-name-link"
                          onClick={() => handleOpenDetailsModal(candidate)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="unregistered-actions-bar compact-actions-bar">
          <div className="bulk-btn-group">
            <button
              type="button"
              className="btn-select-toggle"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="btn-select-toggle"
              onClick={handleDeselectAll}
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSendNotifications}
          >
            Send Notifications
          </button>
        </div>
      </section>

      {/* SECTION 2: VIEW COMPLETED OBSERVATION RECORDS (MATCHES A06 TABLE FORMAT) */}
      <section className="dashboard-phase phase-spacing">
        <h3>View Completed Observation Records</h3>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select View Details to see a summary of the completed observation record.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Observee Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Completion Date</th>
                  <th className="align-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {completedList.map((record) => (
                  <tr key={record.id}>
                    <td>{record.candidateName}</td>
                    <td>{record.department}</td>
                    <td>{record.academicLevel}</td>
                    <td>{record.dateFinalized}</td>
                    <td className="align-center">
                      <button
                        type="button"
                        className="table-name-link"
                        onClick={() => handleOpenDetailsModal(record)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Standardized Bottom Return Button */}
      <div className="dashboard-center-action">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate("/committee/dashboard")}
        >
          Return to Dashboard
        </button>
      </div>

      {/* POP-UP MODAL: OBSERVATION DETAILS */}
      {selectedCandidateDetails && (
        <div className="modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3>Observation Record Details</h3>
              <button
                type="button"
                onClick={handleCloseDetailsModal}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <div className="modal-details-list">
              <div className="modal-detail-row">
                <span className="detail-label">Candidate Name:</span>
                <span className="detail-value-bold">
                  {selectedCandidateDetails.candidateName}
                </span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observer Name:</span>
                <span>{selectedCandidateDetails.observerName}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Department:</span>
                <span>{selectedCandidateDetails.department}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Academic Rank:</span>
                <span>{selectedCandidateDetails.academicLevel}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Course & Section:</span>
                <span>{selectedCandidateDetails.courseAndSection}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observation Date:</span>
                <span>{selectedCandidateDetails.observationDate}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Time:</span>
                <span>{selectedCandidateDetails.observationTime}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Location:</span>
                <span>{selectedCandidateDetails.location}</span>
              </div>

              {"dateFinalized" in selectedCandidateDetails && (
                <div className="modal-detail-row">
                  <span className="detail-label">Date Finalized:</span>
                  <span>{selectedCandidateDetails.dateFinalized}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}