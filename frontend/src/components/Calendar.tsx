// src/components/Calendar.tsx
import React, { useState } from "react";

export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface CalendarProps {
  /** Array of ISO strings YYYY-MM-DD currently selected */
  selectedDates?: string[];
  /** Callback fired when user adds or removes a date */
  onDateSelectionChange?: (dates: string[]) => void;
  /** Restrict selection to specific days of week, e.g. ["Mon", "Wed"] */
  allowedDaysOfWeek?: DayOfWeek[];
  /** Earliest selectable date string (YYYY-MM-DD) */
  minDate?: string;
  /** Latest selectable date string (YYYY-MM-DD) */
  maxDate?: string;
  /** Maximum number of dates user can select (e.g., 8) */
  maxSelections?: number;
  /** Disables click interaction (display mode only) */
  readOnly?: boolean;
  /** Initial month to view (0-11, default is current month) */
  initialMonth?: number;
  /** Initial year to view (default is current year) */
  initialYear?: number;
}

const DAYS_HEADER: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat"
};

export default function Calendar({
  selectedDates = [],
  onDateSelectionChange,
  allowedDaysOfWeek,
  minDate,
  maxDate,
  maxSelections = 8,
  readOnly = false,
  initialMonth = new Date().getMonth(),
  initialYear = new Date().getFullYear(),
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [currentYear, setCurrentYear] = useState<number>(initialYear);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Helper to format date into YYYY-MM-DD
  const formatDateString = (year: number, month: number, day: number): string => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Validate if a date is allowed to be picked
  const isDateAllowed = (year: number, month: number, day: number): boolean => {
    if (readOnly) return false;

    const dateStr = formatDateString(year, month, day);
    const dateObj = new Date(year, month, day);
    const dayName = DAY_INDEX_MAP[dateObj.getDay()];

    // Day of week constraint
    if (allowedDaysOfWeek && allowedDaysOfWeek.length > 0) {
      if (!allowedDaysOfWeek.includes(dayName)) return false;
    }

    // Min date constraint
    if (minDate && dateStr < minDate) return false;

    // Max date constraint
    if (maxDate && dateStr > maxDate) return false;

    return true;
  };

  const handleDateClick = (dateStr: string, isAllowed: boolean) => {
    if (readOnly || !isAllowed || !onDateSelectionChange) return;

    const isSelected = selectedDates.includes(dateStr);

    if (isSelected) {
      // Remove date
      onDateSelectionChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      // Enforce max selections limit (e.g. 8)
      if (selectedDates.length >= maxSelections) {
        alert(`You can only select up to ${maxSelections} dates.`);
        return;
      }
      // Add date
      onDateSelectionChange([...selectedDates, dateStr]);
    }
  };

  return (
    <div className="calendar-container">
      {/* Calendar Header with Navigation */}
      <div className="calendar-header">
        <button type="button" className="nav-btn" onClick={handlePrevMonth}>
          &lt;
        </button>

        <div className="calendar-selects">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => initialYear - 5 + i).map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="nav-btn" onClick={handleNextMonth}>
          &gt;
        </button>
      </div>

      {/* Weekday Titles */}
      <div className="calendar-weekdays">
        {DAYS_HEADER.map((day) => (
          <span key={day} className="weekday-label">
            {day.slice(0, 2)}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="calendar-grid">
        {/* Leading empty spaces */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="calendar-day empty" />
        ))}

        {/* Days of month */}
        {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const dateStr = formatDateString(currentYear, currentMonth, dayNumber);
          const isSelected = selectedDates.includes(dateStr);
          const allowed = isDateAllowed(currentYear, currentMonth, dayNumber);

          let className = "calendar-day";
          if (isSelected) className += " selected";
          if (!allowed && !isSelected) className += " disabled";

          return (
            <button
              key={dateStr}
              type="button"
              className={className}
              disabled={!allowed && !isSelected}
              onClick={() => handleDateClick(dateStr, allowed)}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}