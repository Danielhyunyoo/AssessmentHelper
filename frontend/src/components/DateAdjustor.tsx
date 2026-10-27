// src/components/DateAdjustor.tsx
import React, { useState } from "react";

interface DateAdjustorProps {
  currentDate: string; // Format: "YYYY-MM-DD"
  onDateChange: (newDate: string) => void;
}

export default function DateAdjustor({ currentDate, onDateChange }: DateAdjustorProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <div className={`date-adjustor-widget ${isCollapsed ? "collapsed" : ""}`}>
      <div 
        className="date-adjustor-header" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <span className={`collapse-chevron ${isCollapsed ? "up" : "down"}`}>▼</span>
        <span>Simulated Date</span>
      </div>

      {!isCollapsed && (
        <div className="date-adjustor-body">
          <div className="date-input-group">
            <input
              id="simulated-date"
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <p className="date-adjustor-hint">
            Dates adjustable for demo purposes.
          </p>
        </div>
      )}
    </div>
  );
}