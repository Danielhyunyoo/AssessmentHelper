// src/components/DevBar.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  authApi,
  demoApi,
  facultyApi,
  matchingApi,
  observationApi,
  surveyApi,
} from "../api/endpoints";
import type { DemoPersona, ObservationRecord, RegistrationStatus, Survey } from "../api/types";

interface PageItem {
  label: string;
  path: string;
  matchPrefix?: string;
}

interface PageGroup {
  group: string;
  items: PageItem[];
}

async function signInAs(persona: DemoPersona) {
  await authApi.csrf();
  await authApi.login(persona.email, "demo-password");
  window.location.assign(
    persona.role === "admin"
      ? "/committee/dashboard"
      : "/shared/faculty-dashboard"
  );
}

async function signOutUser() {
  try {
    await authApi.logout();
  } catch {
    // Ignore logout errors if already logged out
  }
  window.location.reload();
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
  const [observationRecords, setObservationRecords] = useState<ObservationRecord[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [, setSimulated] = useState(false);
  const [cycle, setCycle] = useState<RegistrationStatus | null>(null);
  const [resetting, setResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetError, setResetError] = useState("");

  async function refreshInspectionData() {
    try {
      const [records, surveyResults] = await Promise.all([
        observationApi.list(),
        surveyApi.list(),
      ]);

      setObservationRecords(records);
      setSurveys(surveyResults);
    } catch {
      setObservationRecords([]);
      setSurveys([]);
    }
  }

  // Resolved IDs for direct S05 / S06 demo access
  const [demoObservationId, setDemoObservationId] = useState<number>(1);
  const [demoPairingId, setDemoPairingId] = useState<number>(1);
  const [hasLiveMatch, setHasLiveMatch] = useState<boolean>(false);

  async function resetData() {
    setResetting(true);
    setResetError("");
    try {
      await demoApi.reset();
      window.location.assign("/");
    } catch (err) {
      const message =
        err instanceof Error && err.message.length < 200 ? err.message : "";
      setResetError(
        message ||
          "Reset failed. Check that the backend and the database are running."
      );
      setResetting(false);
    }
  }

  useEffect(() => {
    authApi
      .session()
      .then((result) => setUser(result.professor?.email ?? ""))
      .catch(() => setUser(""));

    demoApi.personas().then(setPersonas).catch(() => {});
    observationApi.list()
      .then(setObservationRecords)
      .catch(() => setObservationRecords([]));
    surveyApi.list()
      .then(setSurveys)
      .catch(() => setSurveys([]));

    demoApi
      .date()
      .then(async (result) => {
        if (!result.simulated_date && !today) {
          const currentYear = new Date().getFullYear();
          const defaultSept1 = `${currentYear}-09-01`;
          setTodayValue(defaultSept1);
          await demoApi.setDate(defaultSept1);
        } else {
          setTodayValue(result.today);
          setSimulated(result.simulated_date !== null);
        }
      })
      .catch(() => {});

    facultyApi.registrationStatus().then(setCycle).catch(() => {});

    // Resolve the latest observation_id and pairing_id so S05 & S06 open directly
    Promise.all([
      observationApi.list().catch(() => []),
      observationApi.scheduled().catch(() => []),
      matchingApi.sentInvitations().catch(() => []),
      matchingApi.incomingInvitations().catch(() => []),
    ])
      .then(([records, scheduled, sentInvs, incomingInvs]) => {
        const recordList = Array.isArray(records) ? records : [];
        const scheduledList = Array.isArray(scheduled) ? scheduled : [];
        const confirmedSent = (Array.isArray(sentInvs) ? sentInvs : []).find(
          (i) => i.status === "confirmed" || i.status === "accepted"
        );
        const confirmedIncoming = (
          Array.isArray(incomingInvs) ? incomingInvs : []
        ).find((i) => i.status === "confirmed" || i.status === "accepted");

        const foundObsId = recordList[0]?.observation_id;
        const foundPairingId =
          recordList[0]?.pairing_id ??
          scheduledList[0]?.pairing_id ??
          confirmedSent?.invitation_id ??
          confirmedIncoming?.invitation_id;

        if (foundObsId) {
          setDemoObservationId(foundObsId);
        }
        if (foundPairingId) {
          setDemoPairingId(foundPairingId);
        }
        setHasLiveMatch(
          Boolean(
            recordList.length > 0 ||
              scheduledList.length > 0 ||
              confirmedSent ||
              confirmedIncoming
          )
        );
      })
      .catch(() => {});
  }, [location.pathname]);

  const s05Path = `/shared/observation-record/${demoObservationId}`;
  const s06Path = `/shared/post-evaluation-survey?pairingId=${demoPairingId}`;

  const pageGroups: PageGroup[] = [
    {
      group: "Login",
      items: [
        { label: "L01 - Home", path: "/" },
        { label: "L02 - Sign In", path: "/login/signin" },
        { label: "L03 - Sign In 2", path: "/login/signin2" },
      ],
    },
    {
      group: "Shared",
      items: [
        { label: "S01 - Faculty Dashboard", path: "/shared/faculty-dashboard" },
        { label: "S02 - Profile", path: "/shared/profile" },
        { label: "S03 - Notifications", path: "/shared/notifications" },
        {
          label: "S04 - Current and Past Observations",
          path: "/shared/current-past-observations",
        },
        {
          label: `S05 - Observation Record (Demo #${demoObservationId})`,
          path: s05Path,
          matchPrefix: "/shared/observation-record",
        },
        {
          label: `S06 - Post-Evaluation Survey (Demo #${demoPairingId})`,
          path: s06Path,
          matchPrefix: "/shared/post-evaluation-survey",
        },
      ],
    },
    {
      group: "Observee",
      items: [
        { label: "E01 - Course Selection", path: "/observee/course-selection" },
        {
          label: "E02 - Observer Selection",
          path: "/observee/observer-selection",
        },
      ],
    },
    {
      group: "Observer",
      items: [
        {
          label: "O01 - Observation Request",
          path: "/observer/observation-request",
        },
      ],
    },
    {
      group: "Assessment Committee",
      items: [
        { label: "A01 - Committee Dashboard", path: "/committee/dashboard" },
        {
          label: "A02 - Faculty Matching",
          path: "/committee/faculty-matching",
        },
        {
          label: "A03 - Unmatched Observees",
          path: "/committee/unmatched-observees",
        },
        { label: "A04 - Faculty Roster", path: "/committee/faculty-roster" },
        {
          label: "A05 - Pending Records",
          path: "/committee/pending-records",
        },
        {
          label: "A06 - Survey Tracking",
          path: "/committee/survey-tracking",
        },
        { label: "A07 - KPI Overview", path: "/committee/kpi-overview" },
        { label: "A08 - Form Editor", path: "/committee/form-editor" },
      ],
    },
  ];

  const allPages = pageGroups.flatMap((g) => g.items);

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    try {
      localStorage.setItem("devBarOpen", String(nextOpen));
    } catch {
      // Ignore storage errors
    }
  }

  const currentIndex = allPages.findIndex((item) =>
    item.matchPrefix
      ? location.pathname.startsWith(item.matchPrefix)
      : item.path === location.pathname
  );

  const selectedSelectValue =
    currentIndex !== -1 ? allPages[currentIndex].path : location.pathname;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      navigate(allPages[currentIndex - 1].path);
    }
  };

  const handleNext = () => {
    if (currentIndex !== -1 && currentIndex < allPages.length - 1) {
      navigate(allPages[currentIndex + 1].path);
    } else if (currentIndex === -1 && allPages.length > 0) {
      navigate(allPages[0].path);
    }
  };

  const currentShortName =
    currentIndex !== -1
      ? allPages[currentIndex].label.split(" - ")[0]
      : "Custom";
  const totalPagesCount = allPages.length;

  return (
    <aside className={`dev-panel ${open ? "is-open" : "is-closed"}`}>
      <button type="button" className="dev-panel-header" onClick={toggle}>
        <div className="dev-header-title">
          <span className="dev-chevron">{open ? "▼" : "▶"}</span>
          <span className="dev-header-label">Demo Controls</span>
        </div>
        <span className="dev-header-badge">
          {currentShortName} ({currentIndex !== -1 ? currentIndex + 1 : "?"}/
          {totalPagesCount})
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
                value={selectedSelectValue}
                onChange={(event) => navigate(event.target.value)}
              >
                {pageGroups.map((groupObj) => (
                  <optgroup key={groupObj.group} label={groupObj.group}>
                    {groupObj.items.map((item) => (
                      <option key={item.label} value={item.path}>
                        {item.label}
                      </option>
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
                  disabled={
                    currentIndex === -1 || currentIndex >= allPages.length - 1
                  }
                >
                  Next →
                </button>
              </div>

              <div className="dev-field-row">
                <label className="dev-label">
                  Open Observation Record (S05)
                </label>

                <select
                  className="dev-select"
                  value=""
                  onChange={(event) => {
                    const observationId = event.target.value;

                    if (observationId) {
                      navigate(`/shared/observation-record/${observationId}`);
                    }
                  }}
                >
                  <option value="">Select an observation record...</option>

                  {observationRecords.map((record) => (
                    <option
                      key={record.observation_id}
                      value={record.observation_id}
                    >
                      #{record.observation_id} - {record.observer.name}
                      {" / "}
                      {record.observee.name}
                      {" - "}
                      {record.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dev-field-row">
                <label className="dev-label">
                  Open Process Survey (S06)
                </label>

                <select
                  className="dev-select"
                  value=""
                  onChange={(event) => {
                    const selected = event.target.value;

                    if (selected.startsWith("survey:")) {
                      const surveyId = selected.slice(7);

                      navigate(`/shared/post-evaluation-survey/${surveyId}`);
                    } else if (selected.startsWith("pairing:")) {
                      const pairingId = selected.slice(8);

                      navigate(
                        `/shared/post-evaluation-survey?pairingId=${pairingId}`
                      );
                    }
                  }}
                >
                  <option value="">Select a process survey...</option>

                  {surveys.map((survey) => (
                    <option
                      key={`survey-${survey.survey_id}`}
                      value={`survey:${survey.survey_id}`}
                    >
                      Survey #{survey.survey_id}
                      {" - "}
                      {survey.respondent_type}
                      {" - "}
                      {survey.status}
                    </option>
                  ))}

                  {observationRecords
                    .filter(
                      (record) =>
                        record.status === "completed" &&
                        !surveys.some(
                          (survey) => survey.pairing_id === record.pairing_id
                        )
                    )
                    .map((record) => (
                      <option
                        key={`pairing-${record.pairing_id}`}
                        value={`pairing:${record.pairing_id}`}
                      >
                        New survey - Pairing #{record.pairing_id}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="button"
                className="dev-btn dev-btn-secondary"
                onClick={() => void refreshInspectionData()}
              >
                ↻ Refresh Records and Surveys
              </button>
            </div>
          </div>

          {/* Direct Demo Access for S05 & S06 */}
          <div className="dev-card">
            <div className="dev-card-title">
              Form &amp; Survey Preview (S05 / S06)
            </div>
            <p
              className="dev-caption"
              style={{ marginTop: 0, marginBottom: "0.5rem" }}
            >
              {hasLiveMatch
                ? `Active match detected (Pairing #${demoPairingId}). Open forms directly:`
                : "Bypass S04 lock to inspect the Observation Form & Survey layouts:"}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
              }}
            >
              <button
                type="button"
                className="dev-btn dev-btn-secondary"
                onClick={() => navigate(s05Path)}
              >
                Open S05 Observation Form →
              </button>
              <button
                type="button"
                className="dev-btn dev-btn-secondary"
                onClick={() => navigate(s06Path)}
              >
                Open S06 Post-Evaluation Survey →
              </button>
            </div>
          </div>

          {/* Section 2: Persona & Date Simulation */}
          <div className="dev-card">
            <div className="dev-card-title">Simulation Settings</div>
            <div className="dev-field-row">
              <label className="dev-label">Act As</label>
              <select
                className="dev-select"
                value={user || "signed_out"}
                onChange={(event) => {
                  const val = event.target.value;
                  if (val === "signed_out") {
                    void signOutUser();
                  } else {
                    const persona = personas.find((item) => item.email === val);
                    if (persona) void signInAs(persona);
                  }
                }}
              >
                <option value="signed_out">Signed Out (Guest)</option>
                {personas.map((persona) => (
                  <option key={persona.email} value={persona.email}>
                    {persona.name} ({persona.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="dev-field-row">
              <label className="dev-label">Simulated Date</label>
              <div
                className="dev-date-wrapper"
                style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
              >
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
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
                  <svg
                    className="dev-date-calendar-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <button
                  type="button"
                  className="dev-btn dev-btn-secondary"
                  style={{
                    width: "auto",
                    padding: "0.4rem 0.6rem",
                    whiteSpace: "nowrap",
                  }}
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
                    <span className="dev-deadline-val">
                      {cycle.signup_deadline}
                    </span>
                  </div>
                  <div className="dev-deadline-item">
                    <span className="dev-deadline-tag">Observe</span>
                    <span className="dev-deadline-val">
                      {cycle.observation_deadline}
                    </span>
                  </div>
                  <div className="dev-deadline-item">
                    <span className="dev-deadline-tag">Survey</span>
                    <span className="dev-deadline-val">
                      {cycle.survey_deadline}
                    </span>
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
                <li>
                  <span>1</span> Sign in as a faculty member.
                </li>
                <li>
                  <span>2</span> Register for the evaluation cycle.
                </li>
                <li>
                  <span>3</span> Select course &amp; submit observation dates.
                </li>
                <li>
                  <span>4</span> Sign in as Assessment Committee.
                </li>
                <li>
                  <span>5</span> Review matching &amp; release candidates.
                </li>
                <li>
                  <span>6</span> Sign in as observee &amp; pick observer.
                </li>
                <li>
                  <span>7</span> Complete record &amp; submit signatures.
                </li>
                <li>
                  <span>8</span> Advance demo date past observation deadline.
                </li>
                <li>
                  <span>9</span> Submit process surveys.
                </li>
                <li>
                  <span>10</span> Review survey tracking &amp; KPIs.
                </li>
              </ol>
            )}
          </div>

          {/* Section 4: Data Reset & Disclaimer */}
          <div className="dev-card dev-reset-card">
            {confirmingReset ? (
              <>
                <p className="dev-caption">
                  This resets the demo for everyone using this link. Continue?
                </p>
                <button
                  type="button"
                  className="dev-btn dev-btn-danger"
                  onClick={() => {
                    setConfirmingReset(false);
                    void resetData();
                  }}
                >
                  Yes, reset for everyone
                </button>
                <button type="button" className="dev-btn dev-btn-secondary" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="dev-btn dev-btn-danger"
                onClick={() => setConfirmingReset(true)}
                disabled={resetting}
              >
                {resetting ? "Resetting Demo..." : "↺ Reset Demonstration Data"}
              </button>
            )}

            {resetError && (
              <p className="dev-error-text" role="alert">
                {resetError}
              </p>
            )}

            <p className="dev-caption">
              Restores initial demo dataset. Avoid resetting while team members
              are actively testing.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}