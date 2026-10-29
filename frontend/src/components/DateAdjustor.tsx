// src/components/DateAdjustor.tsx
import React, { useEffect, useState } from "react";
import { facultyApi } from "../api/endpoints";
import type { RegistrationStatus } from "../api/types";

interface DateAdjustorProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
}

function formatDate(value: string) {
  if (!value) return "Not available";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DateAdjustor({
  currentDate,
  onDateChange,
}: DateAdjustorProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [cycleDates, setCycleDates] = useState<RegistrationStatus | null>(null);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCycleDates() {
      try {
        const result = await facultyApi.registrationStatus();

        if (!cancelled) {
          setCycleDates(result);
        }
      } catch {
        if (!cancelled) {
          setDateError("Actual cycle dates could not be loaded.");
        }
      }
    }

    void loadCycleDates();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`date-adjustor-widget ${isCollapsed ? "collapsed" : ""}`}>
      <div
        className="date-adjustor-header"
        onClick={() => setIsCollapsed((previous) => !previous)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <span className={`collapse-chevron ${isCollapsed ? "up" : "down"}`}>
          ▼
        </span>
        <span>Date Controls</span>
      </div>

      {!isCollapsed && (
        <div className="date-adjustor-body">
          <h4>Actual Evaluation Cycle Dates</h4>

          {cycleDates ? (
            <>
              <p>
                <strong>{cycleDates.cycle_name}</strong>
              </p>
              <p>
                Cycle: {formatDate(cycleDates.start_date)} –{" "}
                {formatDate(cycleDates.end_date)}
              </p>
              <p>
                Registration deadline:{" "}
                {formatDate(cycleDates.signup_deadline)}
              </p>
              <p>
                Observation deadline:{" "}
                {formatDate(cycleDates.observation_deadline)}
              </p>
              <p>
                Survey deadline: {formatDate(cycleDates.survey_deadline)}
              </p>
            </>
          ) : (
            <p>{dateError || "Loading actual cycle dates..."}</p>
          )}

          <hr />

          <h4>Simulated Date</h4>
          <div className="date-input-group">
            <input
              id="simulated-date"
              type="date"
              value={currentDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </div>

          <p className="date-adjustor-hint">
            This date is for demo purposes. It does not change the actual
            evaluation-cycle dates stored by the committee.
          </p>
        </div>
      )}
    </div>
  );
}