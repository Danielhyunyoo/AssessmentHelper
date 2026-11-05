// src/components/DevBar.tsx
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

// Flattened list for index calculations and lookup navigation
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
        // Default to Sept 1 of the current year if no simulated date is active yet
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

  // Find current page index for Previous / Next buttons
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
    <aside className="dev-panel">
      <button type="button" className="dev-panel-header" onClick={toggle}>
        {open ? "▼" : "▶"} Page preview · {currentShortName} · {currentIndex !== -1 ? currentIndex + 1 : "?"} of {totalPagesCount}
      </button>

      {open && (
        <div className="dev-panel-body">
          <div className="dev-section-title">Inspect a page</div>

          <label className="dev-field">
            <select 
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
          </label>

          <div className="dev-nav-buttons">
            <button 
              type="button" 
              className="dev-btn-sub" 
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
            >
              Previous
            </button>
            <button 
              type="button" 
              className="dev-btn-sub" 
              onClick={handleNext}
              disabled={currentIndex === -1 || currentIndex >= ALL_PAGES.length - 1}
            >
              Next
            </button>
          </div>

          <hr className="dev-divider" />

          <label className="dev-field">
            <span>As:</span>
            <select
              value={user}
              onChange={(event) => {
                const persona = personas.find((item) => item.email === event.target.value);
                if (persona) void signInAs(persona);
              }}
            >
              <option value="" disabled>{personas.length ? "Signed Out" : "No demo accounts"}</option>
              {personas.map((persona) => <option key={persona.email} value={persona.email}>{persona.name}</option>)}
            </select>
          </label>

          <label className="dev-field">
            <span>Today:</span>
            <input
              type="date"
              value={today}
              onChange={(event) => {
                const value = event.target.value;
                setTodayValue(value);
                if (Number(value.slice(0, 4)) >= 2000) void setToday(value);
              }}
            />
          </label>

          {cycle && (
            <div className="dev-cycle-info">
              <small>
                signup: {cycle.signup_deadline}<br />
                observe: {cycle.observation_deadline}<br />
                survey: {cycle.survey_deadline}
              </small>
            </div>
          )}

          <button type="button" className="dev-btn-sub" onClick={() => void resetData()} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset Data"}
          </button>
          {resetError && <p className="dev-footer-note" role="alert">{resetError}</p>}
          
          <p className="dev-footer-note">
            This widget is for demo purposes only.
          </p>
        </div>
      )}
    </aside>
  );
}