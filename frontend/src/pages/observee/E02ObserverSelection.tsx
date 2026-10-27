// src/pages/observee/E02ObserverSelection.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import DataTable, { Column } from "../../components/DataTable";
import Calendar from "../../components/Calendar";

interface Candidate {
  id: string;
  observerName: string;
  department: string;
  academicLevel: string;
}

interface ResponseRecord {
  id: string;
  observerName: string;
  proposedDateTime: string;
  responseStatus: "CONFIRMED" | "PENDING" | "DECLINED" | "CANCELLED";
}

export default function E02ObserverSelection() {
  // Mock data for selected observation dates (passed from E01 state or context)
  const selectedDatesList = ["2026-10-12", "2026-10-14", "2026-10-16", "2026-10-19", "2026-10-21"];

  // State for candidates selection table
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  // Store selected observation dates per candidate (candidateId -> array of date strings)
  const [candidateDates, setCandidateDates] = useState<Record<string, string[]>>({});

  const candidateData: Candidate[] = [
    { id: "1", observerName: "Professor B", department: "Computer Science", academicLevel: "Assistant Professor" },
    { id: "2", observerName: "Professor C", department: "Computer Science", academicLevel: "Full Professor" },
    { id: "3", observerName: "Professor D", department: "Computer Science", academicLevel: "Full Professor" },
    { id: "4", observerName: "Professor E", department: "Computer Science", academicLevel: "Full Professor" },
    { id: "5", observerName: "Professor F", department: "Computer Science", academicLevel: "Associate Professor" },
  ];

  // Mock records connected to SQL database response status
  const responseData: ResponseRecord[] = [
    { id: "1", observerName: "Professor B", proposedDateTime: "Oct 12 @ 1:00 PM - 2:15 PM", responseStatus: "CONFIRMED" },
    { id: "2", observerName: "Professor C", proposedDateTime: "Oct 14 @ 1:00 PM - 2:15 PM", responseStatus: "PENDING" },
    { id: "3", observerName: "Professor D", proposedDateTime: "Oct 16 @ 1:00 PM - 2:15 PM", responseStatus: "DECLINED" },
    { id: "4", observerName: "Professor E", proposedDateTime: "Oct 19 @ 1:00 PM - 2:15 PM", responseStatus: "CONFIRMED" },
    { id: "5", observerName: "Professor F", proposedDateTime: "Oct 21 @ 1:00 PM - 2:15 PM", responseStatus: "CANCELLED" },
  ];

  // Toggle candidate checkbox selection
  const handleCheckboxToggle = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle individual date selection per professor (interactive chips)
  const toggleCandidateDate = (candidateId: string, dateStr: string) => {
    setCandidateDates((prev) => {
      const currentDates = prev[candidateId] || [];
      const exists = currentDates.includes(dateStr);

      const updated = exists
        ? currentDates.filter((d) => d !== dateStr)
        : [...currentDates, dateStr];

      return { ...prev, [candidateId]: updated };
    });
  };

  // Columns for Table 1: Matched Observer Candidates
  const candidateColumns: Column<Candidate>[] = [
    {
      header: "Select",
      width: "60px",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedCandidates.includes(row.id)}
          onChange={() => handleCheckboxToggle(row.id)}
        />
      ),
    },
    { header: "Observer Name", accessor: "observerName" },
    { header: "Department", accessor: "department" },
    { header: "Academic Level", accessor: "academicLevel" },
    {
      header: "Observation Date(s)",
      width: "300px",
      render: (row) => {
        const activeDates = candidateDates[row.id] || [];

        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {selectedDatesList.map((dateStr, idx) => {
              const isSelected = activeDates.includes(dateStr);
              const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              );

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCandidateDate(row.id, dateStr)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: isSelected ? "1px solid #000000" : "1px solid #cbd5e1",
                    backgroundColor: isSelected ? "#000000" : "#ffffff",
                    color: isSelected ? "#ffffff" : "#334155",
                    transition: "all 0.15s ease",
                  }}
                >
                  {formattedDate} {isSelected ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        );
      },
    },
  ];

  // Columns for Table 2: Pending and Confirmed Responses
  const responseColumns: Column<ResponseRecord>[] = [
    {
      header: "",
      width: "40px",
      render: () => <span style={{ color: "#94a3b8" }}>-</span>,
    },
    { header: "Observer Name", accessor: "observerName" },
    { header: "Proposed Date and Time", accessor: "proposedDateTime" },
    { header: "Observer Response", accessor: "responseStatus" },
    {
      header: "Actions",
      render: (row) => {
        if (row.responseStatus === "PENDING") {
          return <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>AWAITING RESPONSE</span>;
        }
        if (row.responseStatus === "CONFIRMED") {
          return (
            <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "700" }}>
              ACCEPTED
            </span>
          );
        }
        if (row.responseStatus === "DECLINED" || row.responseStatus === "CANCELLED") {
          return (
            <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "700" }}>
              DECLINED
            </span>
          );
        }
        return <span>-</span>;
      },
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection</h2>

      {/* Top Section: Registered Course Info & Calendar Widget */}
      <section className="table-container theme-orange" style={{ padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your Registered Course Information</h3>
            <p><strong>Course Number and Title:</strong> CS 1337 - Computer Science I</p>
            <p style={{ marginTop: "0.5rem" }}><strong>Course Section:</strong> Section 002</p>
            <p style={{ marginTop: "0.5rem" }}><strong>Meeting Days and Times:</strong> MW 1:00 PM - 2:15 PM</p>
            <p style={{ marginTop: "0.5rem" }}><strong>Classroom Location(s):</strong> ECSS 2.412</p>
          </div>

          <div>
            <Calendar
              selectedDates={selectedDatesList}
              onDateSelectionChange={() => {}}
              allowedDaysOfWeek={["Mon", "Wed"]}
              maxSelections={8}
              minDate="2026-10-01"
              maxDate="2026-11-15"
              initialMonth={9}
              initialYear={2026}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Select from Matched Observer Candidates List */}
      <section className="dashboard-phase" style={{ marginTop: "2rem" }}>
        <h3>Select from Matched Observer Candidates List</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> Please make sure ALL proposed Observation Dates fall before Nov 15.
        </div>

        <DataTable
          themeColor="orange"
          instructionText="Select candidates to send an observation request for your registered course times."
          columns={candidateColumns}
          data={candidateData}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="secondary-btn" onClick={() => setSelectedCandidates(candidateData.map((c) => c.id))}>
              Select All
            </button>
            <button type="button" className="secondary-btn" onClick={() => setSelectedCandidates([])}>
              Deselect All
            </button>
          </div>

          <button type="button" className="primary-btn" onClick={() => alert("Invitation requests sent!")}>
            Send Invitation Requests
          </button>
        </div>
      </section>

      {/* Section 3: Pending and Confirmed Observer Responses */}
      <section className="dashboard-phase" style={{ marginTop: "2.5rem" }}>
        <h3>Pending and Confirmed Observer Responses</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> Accepting an Observer will lock in your choice and automatically decline remaining candidates.
        </div>

        <DataTable
          themeColor="green"
          instructionText="Review responses from invited observers."
          columns={responseColumns}
          data={responseData}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
          <button type="button" className="secondary-btn">
            Reject All
          </button>
          <button type="button" className="primary-btn" onClick={() => alert("Changes confirmed and locked!")}>
            Confirm and Lock Changes
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "2.5rem" }}>
          <Link to="/shared/faculty-dashboard" className="secondary-btn">
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}