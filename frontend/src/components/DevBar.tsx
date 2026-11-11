import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, demoApi, facultyApi } from "../api/endpoints";
import type { DemoPersona, RegistrationStatus } from "../api/types";

// Grouped page options with category headers for the dropdown
const PAGE_GROUPS: { group: string; items: [string, string][] }[] = [
  {
    group: "Login",
    items: [
      ["L01 - Home", "/"],
      ["L02 - Sign In", "/login/signin"],
      ["L03 - Sign In 2", "/login/signin2"],
    ],
  },
  {
    group: "Shared",
    items: [
      ["S01 - Faculty Dashboard", "/shared/faculty-dashboard"],
      ["S02 - Profile", "/shared/profile"],
      ["S03 - Notifications", "/shared/notifications"],
      ["S04 - Current and Past Observations", "/shared/current-past-observations"],
      ["S05 - Observation Record (open from S04)", "/shared/current-past-observations"],
      ["S06 - Post-Evaluation Survey (open from S04)", "/shared/current-past-observations"],
    ],
  },
  {
    group: "Observee",
    items: [
      ["E01 - Course Selection", "/observee/course-selection"],
      ["E02 - Observer Selection", "/observee/observer-selection"],
    ],
  },
  {
    group: "Observer",
    items: [
      ["O01 - Observation Request", "/observer/observation-request"],
    ],
  },
  {
    group: "Assessment Committee",
    items: [
      ["A01 - Committee Dashboard", "/committee/dashboard"],
      ["A02 - Faculty Matching", "/committee/faculty-matching"],
      ["A03 - Unmatched Observees", "/committee/unmatched-observees"],
      ["A04 - Faculty Roster", "/committee/faculty-roster"],
      ["A05 - Pending Records", "/committee/pending-records"],
      ["A06 - Survey Tracking", "/committee/survey-tracking"],
      ["A07 - KPI Overview", "/committee/kpi-overview"],
      ["A08 - Form Editor", "/committee/form-editor"],
    ],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.items);

async function signInAs(persona: DemoPersona) {
  await authApi.csrf();
  await authApi.login(persona.email, "demo-password");
  window.location.assign(persona.role === "admin" ? "/committee/dashboard" : "/shared/faculty-dashboard");
}

async function setToday(date: string) {
  await demoApi.setDate(date || null);
  window.location.reload();
}

function savedOpen() {
  try {
    return localStorage.getItem("devBarOpen") !== "false";
  } catch {
    return true;
  }
}

export default function DevBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(savedOpen);
  const [showInstructions, setShowInstructions] = useState(false);
  const location = useLocation();
  const [user, setUser] = useState("");
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [today, setTodayValue] = useState("");
  const [, setSimulated] = useState(false);
  const [cycle, setCycle] = useState<RegistrationStatus | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  async function resetData() {
    setResetting(true);
    setResetError("");
    try {
      await demoApi.reset();
      window.location.assign("/");
    } catch (err) {
      const message = err instanceof Error && err.message.length < 200 ? err.message : "";
      setResetError(message || "Reset failed. Check that the backend and the database are running.");
      setResetting(false);
    }
  }

  useEffect(() => {
    authApi.session().then((result) => setUser(result.professor?.email ?? "")).catch(() => {});
    demoApi.personas().then(setPersonas).catch(() => {});
    demoApi.date().then(async (result) => {
      if (!result.simulated_date && !today) {
        const currentYear = new Date().getFullYear();
        const defaultSept1 = `${currentYear}-09-01`;
        setTodayValue(defaultSept1);
        await demoApi.setDate(defaultSept1);
      } else {
        setTodayValue(result.today);
        setSimulated(result.simulated_date !== null);
      }
    }).catch(() => {});
    facultyApi.registrationStatus().then(setCycle).catch(() => {});
  }, [location.pathname]);

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    try {
      localStorage.setItem("devBarOpen", String(nextOpen));
    } catch {
      // Ignore storage errors
    }
  }

  const currentIndex = ALL_PAGES.findIndex(([, path]) => path === location.pathname);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      navigate(ALL_PAGES[currentIndex - 1][1]);
    }
  };

  const handleNext = () => {
    if (currentIndex !== -1 && currentIndex < ALL_PAGES.length - 1) {
      navigate(ALL_PAGES[currentIndex + 1][1]);
    } else if (currentIndex === -1 && ALL_PAGES.length > 0) {
      navigate(ALL_PAGES[0][1]);
    }
  };

  const currentShortName = currentIndex !== -1 ? ALL_PAGES[currentIndex][0].split(" - ")[0] : "Custom";
  const totalPagesCount = ALL_PAGES.length;

  return (
    <aside className={`dev-panel ${open ? "is-open" : "is-closed"}`}>
      <button type="button" className="dev-panel-header" onClick={toggle}>
        <div className="dev-header-title">
          <span className="dev-chevron">{open ? "▼" : "▶"}</span>
          <span className="dev-header-label">Demo Controls</span>
        </div>
        <span className="dev-header-badge">
          {currentShortName} ({currentIndex !== -1 ? currentIndex + 1 : "?"}/{totalPagesCount})
        </span>
      </button>

      {open && (
        <div className="dev-panel-body">
          {/* Section 1: Page Navigation */}
          <div className="dev-card">
            <div className="dev-card-title">Inspect Page</div>
            <div className="dev-field-group">
              <select 
                className="dev-select"
                value={location.pathname} 
                onChange={(event) => navigate(event.target.value)}
              >
                {PAGE_GROUPS.map((groupObj) => (
                  <optgroup key={groupObj.group} label={groupObj.group}>
                    {groupObj.items.map(([name, path]) => (
                      <option key={path} value={path}>{name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              
              <div className="dev-nav-btn-row">
                <button 
                  type="button" 
                  className="dev-btn dev-btn-secondary" 
                  onClick={handlePrevious}
                  disabled={currentIndex <= 0}
                >
                  ← Prev
                </button>
                <button 
                  type="button" 
                  className="dev-btn dev-btn-secondary" 
                  onClick={handleNext}
                  disabled={currentIndex === -1 || currentIndex >= ALL_PAGES.length - 1}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Persona & Date Simulation */}
          <div className="dev-card">
            <div className="dev-card-title">Simulation Settings</div>
            <div className="dev-field-row">
              <label className="dev-label">Act As</label>
              <select
                className="dev-select"
                value={user}
                onChange={(event) => {
                  const persona = personas.find((item) => item.email === event.target.value);
                  if (persona) void signInAs(persona);
                }}
              >
                <option value="" disabled>{personas.length ? "Signed Out" : "No demo accounts"}</option>
                {personas.map((persona) => (
                  <option key={persona.email} value={persona.email}>
                    {persona.name} ({persona.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="dev-field-row">
              <label className="dev-label">Simulated Date</label>
              <div className="dev-date-wrapper" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                  <input
                    type="date"
                    className="dev-input-date"
                    value={today}
                    onChange={(event) => {
                      setTodayValue(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        const val = event.currentTarget.value;
                        if (Number(val.slice(0, 4)) >= 2000) {
                          void setToday(val);
                        }
                      }
                    }}
                  />
                  <svg className="dev-date-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <button
                  type="button"
                  className="dev-btn dev-btn-secondary"
                  style={{ width: "auto", padding: "0.4rem 0.6rem", whiteSpace: "nowrap" }}
                  onClick={() => {
                    if (Number(today.slice(0, 4)) >= 2000) {
                      void setToday(today);
                    }
                  }}
                  title="Confirm Date"
                >
                  Confirm
                </button>
              </div>
            </div>

            {cycle && (
              <div className="dev-deadlines-section">
                <div className="dev-subhead-title">Important Deadlines</div>
                <div className="dev-deadlines-grid">
                  <div className="dev-deadline-item">
                    <span className="dev-deadline-tag">Signup</span>
                    <span className="dev-deadline-val">{cycle.signup_deadline}</span>
                  </div>
                  <div className="dev-deadline-item">
                    <span className="dev-deadline-tag">Observe</span>
                    <span className="dev-deadline-val">{cycle.observation_deadline}</span>
                  </div>
                  <div className="dev-deadline-item">
                    <span className="dev-deadline-tag">Survey</span>
                    <span className="dev-deadline-val">{cycle.survey_deadline}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Demo Instructions Dropdown */}
          <div className="dev-card">
            <button 
              type="button" 
              className="dev-sub-accordion-trigger"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <span>Suggested Workflow Checklist</span>
              <span>{showInstructions ? "▲" : "▼"}</span>
            </button>

            {showInstructions && (
              <ol className="dev-instructions-list">
                <li><span>1</span> Sign in as a faculty member.</li>
                <li><span>2</span> Register for the evaluation cycle.</li>
                <li><span>3</span> Select course & submit observation dates.</li>
                <li><span>4</span> Sign in as Assessment Committee.</li>
                <li><span>5</span> Review matching & release candidates.</li>
                <li><span>6</span> Sign in as observee & pick observer.</li>
                <li><span>7</span> Complete record & submit signatures.</li>
                <li><span>8</span> Advance demo date past observation deadline.</li>
                <li><span>9</span> Submit process surveys.</li>
                <li><span>10</span> Review survey tracking & KPIs.</li>
              </ol>
            )}
          </div>

          {/* Section 4: Data Reset & Disclaimer */}
          <div className="dev-card dev-reset-card">
            <button 
              type="button" 
              className="dev-btn dev-btn-danger" 
              onClick={() => void resetData()} 
              disabled={resetting}
            >
              {resetting ? "Resetting Demo..." : "↺ Reset Demonstration Data"}
            </button>

            {resetError && <p className="dev-error-text" role="alert">{resetError}</p>}

            <p className="dev-caption">
              Restores initial demo dataset. Avoid resetting while team members are actively testing.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}