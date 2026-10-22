// src/components/NavigationHelper.tsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface PageRoute {
  id: string;
  name: string;
  path: string;
}

const allPages: PageRoute[] = [
  // Login
  { id: "L01", name: "Home", path: "/" },
  { id: "L02", name: "Sign In", path: "/login/signin" },
  { id: "L03", name: "Faculty Registration", path: "/login/faculty-registration" },
  // Shared
  { id: "S01", name: "Faculty Dashboard", path: "/shared/faculty-dashboard" },
  { id: "S02", name: "Profile", path: "/shared/profile" },
  { id: "S03", name: "Notifications", path: "/shared/notifications" },
  // Observee
  { id: "E01", name: "Course and Section Selection", path: "/observee/course-selection" },
  { id: "E02", name: "Observer Selection", path: "/observee/observer-selection" },
  { id: "E03", name: "Observation Record", path: "/observee/observation-record" },
  { id: "E04", name: "Post-Evaluation Survey", path: "/observee/post-evaluation-survey" },
  { id: "E05", name: "Current and Past Observations", path: "/observee/current-past-observations" },
  // Observer
  { id: "O01", name: "Active Observations", path: "/observer/active-observations" },
  { id: "O02", name: "Observation Request", path: "/observer/observation-request" },
  { id: "O03", name: "Observation Record", path: "/observer/observation-record-observer" },
  { id: "O04", name: "Post-Evaluation Survey", path: "/observer/post-evaluation-survey" },
  // Assessment Committee
  { id: "A01", name: "Dashboard", path: "/committee/dashboard" },
  { id: "A02", name: "Faculty Matching", path: "/committee/faculty-matching" },
  { id: "A03", name: "Unmatched Observees", path: "/committee/unmatched-observees" },
  { id: "A04", name: "Faculty Roster", path: "/committee/faculty-roster" },
  { id: "A05", name: "Pending Records", path: "/committee/pending-records" },
  { id: "A06", name: "Survey Tracking", path: "/committee/survey-tracking" },
  { id: "A07", name: "Kpi Overview", path: "/committee/kpi-overview" },
  { id: "A08", name: "Form Editor", path: "/committee/form-editor" },
];

export default function NavigationHelper(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Find current page index
  const currentIndex = allPages.findIndex((p) => p.path === location.pathname);
  const activePage = allPages[currentIndex !== -1 ? currentIndex : 0];

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(e.target.value);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      navigate(allPages[currentIndex - 1].path);
    }
  };

  const handleNext = () => {
    if (currentIndex < allPages.length - 1 && currentIndex !== -1) {
      navigate(allPages[currentIndex + 1].path);
    }
  };

  return (
    <aside className="nav-helper-container">
      <div className="nav-helper-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{isOpen ? "▼" : "▲"}</span>
        <span>
          Page preview · {activePage.id} · {currentIndex !== -1 ? currentIndex + 1 : 1} of {allPages.length}
        </span>
      </div>

      {isOpen && (
        <div className="nav-helper-body">
          <p className="nav-helper-title">Inspect a page</p>

          <select
            value={activePage.path}
            onChange={handleSelectChange}
            className="nav-helper-select"
          >
            <optgroup label="Login">
              {allPages.slice(0, 3).map((p) => (
                <option key={p.id} value={p.path}>
                  {p.id} - {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Shared">
              {allPages.slice(3, 6).map((p) => (
                <option key={p.id} value={p.path}>
                  {p.id} - {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Observee">
              {allPages.slice(6, 11).map((p) => (
                <option key={p.id} value={p.path}>
                  {p.id} - {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Observer">
              {allPages.slice(11, 15).map((p) => (
                <option key={p.id} value={p.path}>
                  {p.id} - {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Assessment Committee">
              {allPages.slice(15).map((p) => (
                <option key={p.id} value={p.path}>
                  {p.id} - {p.name}
                </option>
              ))}
            </optgroup>
          </select>

          <div className="nav-helper-buttons">
            <button onClick={handlePrevious} disabled={currentIndex <= 0}>
              Previous
            </button>
            <button onClick={handleNext} disabled={currentIndex >= allPages.length - 1}>
              Next
            </button>
          </div>

          <p className="nav-helper-footer-text">
            Page loaded with its own sample data. No changes carry between pages.
          </p>
        </div>
      )}
    </aside>
  );
}