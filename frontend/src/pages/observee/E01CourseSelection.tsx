// src/pages/observee/E01CourseSectionSelection.tsx
import { useState, useRef } from "react";
import DataTable, { Column } from "../../components/DataTable";
import Calendar, { DayOfWeek } from "../../components/Calendar";

interface CourseSection {
  id: string;
  className: string;
  section: string;
  meetingTimes: string;
  lastObservationDate: string;
  allowedDays: DayOfWeek[];
}

const sampleSections: CourseSection[] = [
  { 
    id: "1", 
    className: "CS 4349", 
    section: "Sec 002", 
    meetingTimes: "MW 1:00 PM - 2:15 PM", 
    lastObservationDate: "XX/XX/XXXX",
    allowedDays: ["Mon", "Wed"] 
  },
  { 
    id: "2", 
    className: "CS 4349", 
    section: "Sec 004", 
    meetingTimes: "MW 2:30 PM - 3:45 PM", 
    lastObservationDate: "XX/XX/XXXX",
    allowedDays: ["Mon", "Wed"] 
  },
  { 
    id: "3", 
    className: "CS 4349", 
    section: "Sec 005", 
    meetingTimes: "TTh 1:00 PM - 2:15 PM", 
    lastObservationDate: "XX/XX/XXXX",
    allowedDays: ["Tue", "Thu"] 
  },
];

export default function E01CourseSectionSelection() {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("1");
  const [confirmedSectionId, setConfirmedSectionId] = useState<string>("1");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendarSection, setShowCalendarSection] = useState<boolean>(false);

  // Refs for smooth scrolling
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentSection = sampleSections.find((s) => s.id === confirmedSectionId) || sampleSections[0];

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

  const handleConfirmClass = () => {
    // If the user selected a different course than before, reset the dates
    if (selectedSectionId !== confirmedSectionId) {
      setConfirmedSectionId(selectedSectionId);
      setSelectedDates([]);
    }

    setShowCalendarSection(true);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleScrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSaveToDatabase = async () => {
    const payload = {
      sectionId: currentSection.id,
      courseName: currentSection.className,
      sectionNumber: currentSection.section,
      selectedObservationDates: selectedDates,
    };

    console.log("Submitting to SQL Database:", payload);
    alert(`Successfully saved ${selectedDates.length} dates for ${currentSection.className} (${currentSection.section})!`);
  };

  return (
    <div className="dashboard-container" ref={topRef}>
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
          <button type="button" className="primary-btn" onClick={handleConfirmClass}>
            Confirm Class and Select Observation Date
          </button>
        </div>
      </section>

      {/* Bottom Registered Course Info Section */}
      {showCalendarSection && (
        <section 
          ref={bottomRef} 
          className="table-container theme-orange" 
          style={{ padding: "1.5rem", marginTop: "2rem" }}
        >
          <div className="yellow-banner" style={{ marginBottom: "1.5rem" }}>
            <strong>IMPORTANT:</strong> Please make sure ALL proposed Observation Dates fall before Nov 15. You can select up to 8 dates.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your Registered Course Information</h3>
              <p><strong>Course Number and Title:</strong> {currentSection.className} - Computer Science I</p>
              <p style={{ marginTop: "0.5rem" }}><strong>Course Section:</strong> {currentSection.section}</p>
              <p style={{ marginTop: "0.5rem" }}><strong>Meeting Days and Times:</strong> {currentSection.meetingTimes}</p>
              <p style={{ marginTop: "0.5rem" }}><strong>Classroom Location(s):</strong> ECSS 2.412</p>
              <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#475569" }}>
                <em>Selected Dates: {selectedDates.length} / 8 max</em>
              </p>
            </div>

            {/* Integrated Calendar Component */}
            <div>
              <Calendar
                selectedDates={selectedDates}
                onDateSelectionChange={setSelectedDates}
                allowedDaysOfWeek={currentSection.allowedDays}
                maxSelections={8}
                minDate="2026-10-01"
                maxDate="2026-11-15"
                initialMonth={9}
                initialYear={2026}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
            <button type="button" className="secondary-btn" onClick={handleScrollToTop}>
              Select a Different Course or Section
            </button>
            <button type="button" className="primary-btn" onClick={handleSaveToDatabase}>
              Confirm Selected Dates and Continue
            </button>
          </div>
        </section>
      )}
    </div>
  );
}