// src/pages/committee/A03UnmatchedObservees.tsx
import { useState } from "react";
import { Link } from "react-router-dom";

interface UnmatchedFaculty {
  id: string;
  name: string;
  department: string;
  academicLevel: string;
  courseSection: string;
}

const mockUnmatchedFaculty: UnmatchedFaculty[] = [
  {
    id: "1",
    name: "Last name, First name",
    department: "Computer Science",
    academicLevel: "Professor",
    courseSection: "CS 4337.007",
  },
  {
    id: "2",
    name: "Last name, First name",
    department: "Computer Science",
    academicLevel: "Professor",
    courseSection: "CS 4337.007",
  },
  {
    id: "3",
    name: "Last name, First name",
    department: "Computer Science",
    academicLevel: "Professor",
    courseSection: "CS 4337.007",
  },
  {
    id: "4",
    name: "Last name, First name",
    department: "Computer Science",
    academicLevel: "Professor",
    courseSection: "CS 4337.007",
  },
  {
    id: "5",
    name: "Last name, First name",
    department: "Computer Science",
    academicLevel: "Professor",
    courseSection: "CS 4337.007",
  },
];

export default function A03UnmatchedObservees() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(mockUnmatchedFaculty.map((f) => f.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleTransfer = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one faculty member to transfer.");
      return;
    }
    alert(
      `Transferred ${selectedIds.length} faculty member(s) to the next evaluation cycle.`
    );
  };

  return (
    <div className="dashboard-container">
      {/* Top Back Navigation Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="unmatched-page-title">View Unmatched Observees</h1>

      {/* Yellow Banner with Coded Grey Triangle Icon */}
      <div className="yellow-banner unmatched-alert-margin">
        <strong>
          <span className="warning-icon-triangle">▲</span> ALERT:
        </strong>{" "}
        The observees below could not be matched with the required minimum (5) of eligible observer candidates for this cycle. Select faculty members below to defer them to the next evaluation cycle.
      </div>

      {/* Main Table Container */}
      <div className="unmatched-table-frame">
        <p className="unmatched-table-instruction">
          Select unmatched faculty members to transfer them to next semester's Due List.
        </p>

        <div className="unmatched-table-wrapper">
          <table className="unmatched-table">
            <thead>
              <tr>
                <th className="unmatched-checkbox-cell">Select</th>
                <th>Candidate Name</th>
                <th>Department</th>
                <th>Academic Level</th>
                <th>Course and Section</th>
              </tr>
            </thead>
            <tbody>
              {mockUnmatchedFaculty.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr key={item.id}>
                    <td className="unmatched-checkbox-cell">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                      />
                    </td>
                    <td>{item.name}</td>
                    <td>{item.department}</td>
                    <td>{item.academicLevel}</td>
                    <td>{item.courseSection}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="unmatched-actions-row">
        <div className="unmatched-select-btns">
          <button
            type="button"
            onClick={handleSelectAll}
            className="btn-secondary"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="btn-secondary"
          >
            Deselect All
          </button>
        </div>

        <button
          type="button"
          onClick={handleTransfer}
          className="btn-primary"
        >
          Transfer Professors to Next Evaluation Cycle
        </button>
      </div>

      {/* Bottom Center Return Action */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}