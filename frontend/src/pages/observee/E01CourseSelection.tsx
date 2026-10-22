// src/pages/observee/E01CourseSectionSelection.tsx
import { useState } from "react";
import DataTable, { Column } from "../../components/DataTable";
import Calendar, { DayOfWeek } from "../../components/Calendar";

interface CourseSection {
  id: string;
  className: string;
  section: string;
  meetingTimes: string;
  lastObservationDate: string;
}

const sampleSections: CourseSection[] = [
  { id: "1", className: "CS 4349", section: "Sec 002", meetingTimes: "MW 1:00 PM - 2:15 PM", lastObservationDate: "XX/XX/XXXX" },
  { id: "2", className: "CS 4349", section: "Sec 004", meetingTimes: "MW 2:30 PM - 3:45 PM", lastObservationDate: "XX/XX/XXXX" },
  { id: "3", className: "CS 4349", section: "Sec 005", meetingTimes: "TTh 1:00 PM - 2:15 PM", lastObservationDate: "XX/XX/XXXX" },
];

export default function E01CourseSectionSelection() {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("1");

  const columns: Column<CourseSection>[] = [
    {
      header: "Select",
      width: "60px",
      render: (row: CourseSection) => (
        <input
          type="radio"
          name="courseSection"
          checked={selectedSectionId === row.id}
          onChange={() => setSelectedSectionId(row.id)}
        />
      ),
    },
    { header: "Class Name", accessor: "className" },
    { header: "Section", accessor: "section" },
    { header: "Meeting Times", accessor: "meetingTimes" },
    { header: "Last Observation Date", accessor: "lastObservationDate" },
  ];

  return (
    <div className="dashboard-container">
      <h2>Course and Section Selection</h2>

      {/* Top Card Section */}
      <section className="dashboard-phase">
        <h3>Course Registration for Observation Cycle</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> Course registration closes October 9 at 11:59 PM. You must select and register 1 active course section by this deadline to receive your matched Observer list from the Assessment Committee.
        </div>

        <DataTable
          themeColor="green"
          instructionText="Select ONE class section you wish to have observed for the Fall 2026 cycle. This selection determines your course level and schedule for observer matching."
          columns={columns}
          data={sampleSections}
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="primary-btn">
            Confirm Class and Select Observation Date
          </button>
        </div>
      </section>

      {/* Bottom Registered Course Info Section */}
      <section className="table-container theme-orange" style={{ padding: "1.5rem", marginTop: "2rem" }}>
        <div className="yellow-banner" style={{ marginBottom: "1.5rem" }}>
          <strong>IMPORTANT:</strong> Please make sure ALL proposed Observation Dates fall before Nov 15.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your Registered Course Information</h3>
            <p><strong>Course Number and Title:</strong> CS 1337 - Computer Science I</p>
            <p style={{ marginTop: "0.5rem" }}><strong>Course Section:</strong> Section 002</p>
            <p style={{ marginTop: "0.5rem" }}><strong>Meeting Days and Times:</strong> MW 1:00 PM - 2:15 PM</p>
            <p style={{ marginTop: "0.5rem" }}><strong>Classroom Location(s):</strong> ECSS 2.412</p>
          </div>

          {/* Simple Mockup Calendar View */}
          <div style={{ border: "1px solid #cbd5e1", padding: "1rem", borderRadius: "8px", backgroundColor: "#f8fafc", textAlign: "center" }}>
            <strong>Select Observation Dates (Sept / Oct 2026)</strong>
            <input type="date" style={{ marginTop: "1rem", padding: "0.5rem", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
          <button type="button" className="secondary-btn">Select a Different Course or Section</button>
          <button type="button" className="primary-btn">Confirm Selected Dates and Continue</button>
        </div>
      </section>
    </div>
  );
}