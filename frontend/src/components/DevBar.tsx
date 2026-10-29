import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, demoApi, facultyApi } from "../api/endpoints";
import type { RegistrationStatus } from "../api/types";

const PERSONAS = ["Alice", "Bob", "Carol", "Dave", "Juan", "Diego", "Valeria", "Maria", "Committee"];

const PAGES = [
  ["Home", "/"],
  ["Sign In", "/login/signin"],
  ["Cycle Registration", "/login/signin2"],
  ["Faculty Dashboard", "/shared/faculty-dashboard"],
  ["Profile", "/shared/profile"],
  ["Notifications", "/shared/notifications"],
  ["Current and Past Observations", "/shared/current-past-observations"],
  ["Observation Record", "/shared/observation-record-observer"],
  ["Post-Evaluation Survey", "/shared/post-evaluation-survey"],
  ["Course Selection", "/observee/course-selection"],
  ["Observer Selection", "/observee/observer-selection"],
  ["Observation Request", "/observer/observation-request"],
  ["Committee Dashboard", "/committee/dashboard"],
  ["Faculty Matching", "/committee/faculty-matching"],
  ["Unmatched Observees", "/committee/unmatched-observees"],
  ["Faculty Roster", "/committee/faculty-roster"],
  ["Pending Records", "/committee/pending-records"],
  ["Survey Tracking", "/committee/survey-tracking"],
  ["KPI Overview", "/committee/kpi-overview"],
  ["Form Editor", "/committee/form-editor"],
];

const SIGN_IN_PAGES = ["/", "/login/signin", "/login/signin2"];

async function signInAs(name: string) {
  await authApi.csrf();
  await authApi.login(`${name.toLowerCase()}@utdallas.edu`, "demo-password");
  if (!SIGN_IN_PAGES.includes(window.location.pathname)) {
    window.location.reload();
  } else if (name === "Committee") {
    window.location.assign("/committee/dashboard");
  } else {
    window.location.assign("/shared/faculty-dashboard");
  }
}

async function setToday(date: string) {
  await demoApi.setDate(date || null);
  window.location.reload();
}

async function resetData() {
  await demoApi.reset();
  window.location.assign("/");
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
  const [today, setTodayValue] = useState("");
  const [simulated, setSimulated] = useState(false);
  const [cycle, setCycle] = useState<RegistrationStatus | null>(null);

  useEffect(() => {
    authApi.session().then((result) => setUser(result.professor?.first_name ?? "")).catch(() => {});
    demoApi.date().then((result) => {
      setTodayValue(result.today);
      setSimulated(result.simulated_date !== null);
    }).catch(() => {});
    facultyApi.registrationStatus().then(setCycle).catch(() => {});
  }, []);

  function toggle() {
    setOpen(!open);
    try {
      localStorage.setItem("devBarOpen", String(!open));
    } catch {
      return;
    }
  }

  if (!open) {
    return (
      <button type="button" className="dev-bar-toggle" onClick={toggle}>
        dev tools
      </button>
    );
  }

  return (
    <div className="dev-bar">
      <button type="button" onClick={toggle}>hide</button>

      <label>
        as{" "}
        <select value={user} onChange={(event) => void signInAs(event.target.value)}>
          <option value="" disabled>signed out</option>
          {PERSONAS.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>

      <label>
        today{" "}
        <input type="date" value={today} onChange={(event) => void setToday(event.target.value)} />
      </label>
      {simulated && <button type="button" onClick={() => void setToday("")}>real date</button>}

      {cycle && (
        <span>
          signup {cycle.signup_deadline} · observe {cycle.observation_deadline} · survey {cycle.survey_deadline}
        </span>
      )}

      <label>
        page{" "}
        <select value={location.pathname} onChange={(event) => navigate(event.target.value)}>
          {PAGES.map(([name, path]) => <option key={path} value={path}>{name}</option>)}
        </select>
      </label>

      <button type="button" onClick={() => void resetData()}>reset data</button>
    </div>
  );
}
