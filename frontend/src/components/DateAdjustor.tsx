// src/components/DateAdjustor.tsx
import React, { useEffect, useState } from "react";
import { committeeApi, facultyApi } from "../api/endpoints";
import type { CycleDates, RegistrationStatus } from "../api/types";

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
  const [cycleDates, setCycleDates] = useState<RegistrationStatus | CycleDates | null>(null);
  const [dates, setDates] = useState<CycleDates | null>(null);
  const [isCommittee, setIsCommittee] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState("");
  const [dateMessage, setDateMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCycleDates() {
      try {
        setDateError("");

        // Load the current user's role.
        const profile = await facultyApi.profile();

        if (cancelled) return;

        const committeeUser = profile.professor.role === "admin";
        setIsCommittee(committeeUser);

        if (committeeUser) {
          // Committee users can load the editable cycle-date record.
          const result = await committeeApi.cycleDates();

          if (cancelled) return;

          setCycleDates(result);
          setDates(result);
        } else {
          // Other users can view cycle dates but cannot edit them.
          const result = await facultyApi.registrationStatus();

          if (cancelled) return;

          setCycleDates(result);
        }
      } catch (err) {
        if (!cancelled) {
          setDateError(
            err instanceof Error
              ? err.message
              : "Actual cycle dates could not be loaded."
          );
        }
      }
    }

    void loadCycleDates();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateDate(
    field: keyof CycleDates,
    value: string
  ) {
    setDates((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );

    setDateError("");
    setDateMessage("");
  }

  async function saveCycleDates(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!dates) return;

    if (dates.start_date > dates.end_date) {
      setDateError("The cycle end date cannot be before the start date.");
      return;
    }

    if (dates.signup_deadline < dates.start_date) {
      setDateError(
        "The registration deadline cannot be before the cycle start date."
      );
      return;
    }

    setIsSaving(true);
    setDateError("");
    setDateMessage("");

    try {
      const saved = await committeeApi.updateCycleDates({
        start_date: dates.start_date,
        end_date: dates.end_date,
        signup_deadline: dates.signup_deadline,
        observation_deadline: dates.observation_deadline,
        survey_deadline: dates.survey_deadline,
      });

      setCycleDates(saved);
      setDates(saved);
      setDateMessage("Evaluation cycle dates saved successfully.");
    } catch (err) {
      setDateError(
        err instanceof Error
          ? err.message
          : "Unable to save cycle dates."
      );
    } finally {
      setIsSaving(false);
    }
  }

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

          {isCommittee && dates && (
            <form onSubmit={saveCycleDates}>
              <h4>Edit Actual Cycle Dates</h4>

              <div className="date-input-group">
                <label htmlFor="cycle-start-date">
                  Cycle start date
                </label>
                <input
                  id="cycle-start-date"
                  type="date"
                  value={dates.start_date}
                  onChange={(event) =>
                    updateDate("start_date", event.target.value)
                  }
                  required
                />
              </div>

              <div className="date-input-group">
                <label htmlFor="cycle-end-date">
                  Cycle end date
                </label>
                <input
                  id="cycle-end-date"
                  type="date"
                  value={dates.end_date}
                  onChange={(event) =>
                    updateDate("end_date", event.target.value)
                  }
                  required
                />
              </div>

              <div className="date-input-group">
                <label htmlFor="cycle-signup-deadline">
                  Registration deadline
                </label>
                <input
                  id="cycle-signup-deadline"
                  type="date"
                  value={dates.signup_deadline}
                  onChange={(event) =>
                    updateDate("signup_deadline", event.target.value)
                  }
                  required
                />
              </div>

              <div className="date-input-group">
                <label htmlFor="cycle-observation-deadline">
                  Observation deadline
                </label>
                <input
                  id="cycle-observation-deadline"
                  type="date"
                  value={dates.observation_deadline}
                  onChange={(event) =>
                    updateDate("observation_deadline", event.target.value)
                  }
                  required
                />
              </div>

              <div className="date-input-group">
                <label htmlFor="cycle-survey-deadline">
                  Survey deadline
                </label>
                <input
                  id="cycle-survey-deadline"
                  type="date"
                  value={dates.survey_deadline}
                  onChange={(event) =>
                    updateDate("survey_deadline", event.target.value)
                  }
                  required
                />
              </div>

              <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Cycle Dates"}
              </button>
            </form>
          )}

          {dateError && <p role="alert">{dateError}</p>}
          {dateMessage && <p role="status">{dateMessage}</p>}

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