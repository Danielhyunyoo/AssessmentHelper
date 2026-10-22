import React from "react";
import Calendar from "../../components/Calendar";

export default function ViewObservationRecordPage() {
  // Loaded from SQL Database
  const savedDatesFromSQL = [
    "2026-10-12",
    "2026-10-14",
    "2026-10-16",
    "2026-10-19",
    "2026-10-21",
    "2026-10-23",
    "2026-10-26",
    "2026-10-28",
  ];

  return (
    <div>
      <h2>Observation Schedule</h2>
      <Calendar 
        selectedDates={savedDatesFromSQL} 
        readOnly={true} 
      />
    </div>
  );
}