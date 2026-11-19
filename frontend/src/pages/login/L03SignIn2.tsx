// src/pages/login/L03SignIn2.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor, RegistrationStatus } from "../../api/types";
import { formatDate } from "../../api/format";
import {
  getCarriedForwardRecordForUser,
  type CycleTransferRecord,
} from "../committee/A02FacultyMatching";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TIME_WINDOWS = [
  {
    value: "Morning (8:00 AM - 12:00 PM)",
    label: "Morning",
    sub: "8 AM to 12 PM",
  },
  {
    value: "Afternoon (12:00 PM - 4:00 PM)",
    label: "Afternoon",
    sub: "12 PM to 4 PM",
  },
  {
    value: "Evening (4:00 PM - 8:00 PM)",
    label: "Evening",
    sub: "4 PM to 8 PM",
  },
];

const AVAILABILITY_STORAGE_KEY = "observer_availability_v1";

interface LocationState {
  redirectTo?: string;
}

export default function L03SignIn2() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.redirectTo;

  const [user, setUser] = useState<Professor | null>(null);
  const [pendingWork, setPendingWork] = useState({ requests: 0, visits: false });
  const [registration, setRegistration] = useState<RegistrationStatus | null>(
    null
  );
  const [transferRecord, setTransferRecord] =
    useState<CycleTransferRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return Array.isArray(saved.days) ? saved.days : ["Tue", "Thu"];
    } catch {
      return ["Tue", "Thu"];
    }
  });

  const [selectedWindows, setSelectedWindows] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return Array.isArray(saved.windows)
        ? saved.windows
        : ["Morning (8:00 AM - 12:00 PM)"];
    } catch {
      return ["Morning (8:00 AM - 12:00 PM)"];
    }
  });

  const [availabilityNotes, setAvailabilityNotes] = useState<string>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return typeof saved.notes === "string" ? saved.notes : "";
    } catch {
      return "";
    }
  });

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const { professor: sessionUser } = await authApi.session();
      if (!sessionUser) {
        navigate("/login/signin", { replace: true });
        return;
      }

      if (sessionUser.role === "admin") {
        navigate(redirectTo || "/committee/dashboard", { replace: true });
        return;
      }

      setUser(sessionUser);

      const reg = await facultyApi.registrationStatus();
      const carriedForward = getCarriedForwardRecordForUser(sessionUser, reg);
      setTransferRecord(carriedForward);

      if (reg.is_registered && !carriedForward) {
        navigate(redirectTo || "/shared/faculty-dashboard", { replace: true });
        return;
      }

      setRegistration(reg);

      const dashboard = await facultyApi.dashboard().catch(() => null);
      setPendingWork({
        requests: dashboard?.incoming_requests ?? 0,
        visits: Boolean(dashboard?.modules?.observation_record?.available),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cycle information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();

    const handleDemoReset = () => {
      setSelectedDays(["Tue", "Thu"]);
      setSelectedWindows(["Morning (8:00 AM - 12:00 PM)"]);
      setAvailabilityNotes("");
      setTransferRecord(null);
      void loadPage();
    };

    const handleTransferSync = () => {
      void loadPage();
    };

    window.addEventListener("demo-reset", handleDemoReset);
    window.addEventListener("cycle-transfers-updated", handleTransferSync);
    window.addEventListener("storage", handleTransferSync);
    return () => {
      window.removeEventListener("demo-reset", handleDemoReset);
      window.removeEventListener("cycle-transfers-updated", handleTransferSync);
      window.removeEventListener("storage", handleTransferSync);
    };
  }, []);

  const toggleDay = (day: string) => {
    if (transferRecord) return;
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleWindow = (win: string) => {
    if (transferRecord) return;
    setSelectedWindows((prev) =>
      prev.includes(win) ? prev.filter((w) => w !== win) : [...prev, win]
    );
  };

  const isTransferredToNextCycle = transferRecord !== null;
  const isRegistered =
    (registration?.is_registered ?? false) && !isTransferredToNextCycle;

  const isPastDeadline =
    !isRegistered &&
    !!registration &&
    registration.today > registration.signup_deadline;

  const cycleName = registration?.cycle_name || "Current Evaluation Cycle";
  const targetCycleName =
    transferRecord?.target_cycle || "Next Evaluation Cycle";
  const facultyDestination = redirectTo || "/shared/faculty-dashboard";

  const firstName = (() => {
    if (!user) return "";
    const rec = user as unknown as Record<string, unknown>;
    const fullName = [rec.first_name, rec.last_name]
      .filter((part): part is string => typeof part === "string" && part.trim() !== "")
      .join(" ");
    if (fullName) return fullName;
    if (typeof rec.full_name === "string" && rec.full_name.trim()) {
      return rec.full_name.trim().split(" ")[0];
    }
    if (typeof rec.name === "string" && rec.name.trim()) {
      return rec.name.trim().split(" ")[0];
    }
    return "";
  })();

  const handleRegister = async () => {
    if (isTransferredToNextCycle) {
      setError(
        `Your evaluation has been transferred to ${targetCycleName}. Registration for ${cycleName} is disabled.`
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const existing = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
          );
        } catch {
          return {};
        }
      })();

      localStorage.setItem(
        AVAILABILITY_STORAGE_KEY,
        JSON.stringify({
          ...existing,
          days: selectedDays,
          windows: selectedWindows,
          notes: availabilityNotes.trim(),
          updatedAt: new Date().toISOString(),
        })
      );

      await facultyApi.register();
      window.dispatchEvent(new Event("observer-availability-changed"));
      window.dispatchEvent(new Event("registration-changed"));
      navigate(facultyDestination, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to register for the cycle."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="l03-wrapper">
          <div className="a07-state-box">Getting things ready for you...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="l03-wrapper">
        <div className="l03-hero-header">
          <span className="a01-phase-pill">
            {isTransferredToNextCycle
              ? `Transferred to ${targetCycleName}`
              : "Cycle Registration Required"}
          </span>
          <h2>Welcome{firstName ? `, ${firstName}` : ""}</h2>
          <p className="l03-subtitle">
            {isTransferredToNextCycle
              ? `The Assessment Committee has carried your evaluation forward to ${targetCycleName}. You cannot register for ${cycleName}, though you may still review past observation records, update your profile, or contact the committee.`
              : `Register for ${cycleName} and set your preferred observation times to unlock your dashboard, or view your past observation records below.`}
          </p>
        </div>

        {error && (
          <div role="alert" className="empty-state-banner s04-zero-margin">
            <strong>Error:</strong> {error}
          </div>
        )}

        {(pendingWork.requests > 0 || pendingWork.visits) && (
          <div className="l03-pending-work">
            {pendingWork.requests > 0 && (
              <Link to="/observer/observation-request" className="btn-primary">
                Answer {pendingWork.requests} observation{" "}
                {pendingWork.requests === 1 ? "request" : "requests"} →
              </Link>
            )}
            {pendingWork.visits && (
              <Link to="/shared/current-past-observations" className="btn-primary">
                Open your observation visit →
              </Link>
            )}
          </div>
        )}

        <div className="registration-card">
          {registration && (
            <div className="l03-dates-bar">
              <div className="l03-date-pair">
                <span className="l03-date-label">Semester Window:</span>
                <span className="l03-date-val">
                  {formatDate(registration.start_date)} to{" "}
                  {formatDate(registration.end_date)}
                </span>
              </div>

              <span className="l03-date-divider" aria-hidden="true">
                |
              </span>

              <div className="l03-date-pair">
                <span className="l03-date-label">
                  {isTransferredToNextCycle
                    ? "Assigned Cycle:"
                    : "Signup Deadline:"}
                </span>
                <span className="l03-date-val">
                  {isTransferredToNextCycle
                    ? targetCycleName
                    : formatDate(registration.signup_deadline)}
                </span>
              </div>
            </div>
          )}

          <div className="l03-two-col">
            <div className="l03-col-section">
              <div className="l03-section-head">
                <span className="a01-phase-pill">Quick Overview</span>
                <h3 className="registration-title">How the Cycle Works</h3>
              </div>

              <div className="l03-compact-list">
                <div className="l03-compact-item is-observee">
                  <div className="l03-compact-item-top">
                    <span className="l03-compact-title">Being Observed</span>
                    <span className="pill-badge pill-observee">Observee</span>
                  </div>
                  <p className="l03-compact-brief">
                    If you are due for evaluation this semester, you will pick{" "}
                    <strong>one class section</strong> and invite colleagues
                    from your matched list to visit.
                  </p>
                </div>

                <div className="l03-compact-item is-observer">
                  <div className="l03-compact-item-top">
                    <span className="l03-compact-title">Observing Peers</span>
                    <span className="pill-badge pill-observer">Observer</span>
                  </div>
                  <p className="l03-compact-brief">
                    Joining the cycle also adds you to the observer pool so you
                    can accept <strong>1 to 3 peer visits</strong> that fit your
                    teaching schedule.
                  </p>
                </div>

                <div className="l03-compact-item">
                  <div className="l03-compact-item-top">
                    <span className="l03-compact-title">
                      Past Observation Records
                    </span>
                    <span className="version-pill">No Signup Needed</span>
                  </div>
                  <p className="l03-compact-brief">
                    Not participating in this cycle? You can review your
                    completed observation archive anytime without registering.
                  </p>
                </div>
              </div>
            </div>

            <div className="l03-col-section is-right">
              <div className="l03-section-head">
                <span className="a01-phase-pill">Availabilities</span>
                <h3 className="registration-title">Your Preferred Schedule</h3>
              </div>

              <p className="l03-avail-hint">
                {isTransferredToNextCycle
                  ? `Cycle registration is locked while your evaluation is deferred to ${targetCycleName}.`
                  : "Share the days and times that usually work best for you to observe a class before registering."}
              </p>

              <div className="l03-field-block">
                <span className="l03-field-label">Days That Work Best</span>
                <div className="l03-chip-group">
                  {DAYS_OF_WEEK.map((day) => {
                    const active = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={isTransferredToNextCycle}
                        className={`l03-chip-btn ${
                          active ? "is-selected" : ""
                        }`}
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="l03-field-block">
                <span className="l03-field-label">Preferred Time of Day</span>
                <div className="l03-window-grid">
                  {TIME_WINDOWS.map((win) => {
                    const active = selectedWindows.includes(win.value);
                    return (
                      <button
                        key={win.value}
                        type="button"
                        disabled={isTransferredToNextCycle}
                        className={`l03-window-btn ${
                          active ? "is-selected" : ""
                        }`}
                        onClick={() => toggleWindow(win.value)}
                      >
                        <span className="l03-window-title">{win.label}</span>
                        <span className="l03-window-sub">{win.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="l03-field-block">
                <label htmlFor="l03-avail-notes" className="l03-field-label">
                  Anything Else to Keep in Mind? (Optional)
                </label>
                <input
                  id="l03-avail-notes"
                  type="text"
                  disabled={isTransferredToNextCycle}
                  className="l03-notes-input"
                  placeholder="e.g., Free after 11:00 AM on Mon and Wed"
                  value={availabilityNotes}
                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isTransferredToNextCycle ? (
            <div className="l03-footer-bar">
              <div className="empty-state-banner s04-zero-margin">
                <strong>Transferred to {targetCycleName}:</strong>{" "}
                {transferRecord?.note
                  ? `Your evaluation was carried forward (${transferRecord.note}). `
                  : "Your evaluation has been carried forward to the next semester. "}
                Registration for {cycleName} is unavailable.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to="/shared/contact-committee"
                  className="btn-secondary"
                >
                  Contact Assessment Committee
                </Link>
                <Link
                  to="/shared/current-past-observations"
                  className="btn-primary l03-primary-cta"
                >
                  View Observation Records →
                </Link>
              </div>
            </div>
          ) : isPastDeadline ? (
            <div className="l03-footer-bar">
              <div className="empty-state-banner s04-zero-margin">
                <strong>Signup Closed:</strong> The registration window for{" "}
                {cycleName} has ended.
              </div>

              <Link
                to="/shared/current-past-observations"
                className="btn-primary l03-primary-cta"
              >
                View Observation Records →
              </Link>
            </div>
          ) : (
            <div className="l03-footer-bar">
              <div className="registration-link-container">
                <Link
                  to="/shared/current-past-observations"
                  className="btn-secondary"
                >
                  View Past Observation Records →
                </Link>
              </div>

              <button
                type="button"
                className="btn-primary l03-primary-cta"
                onClick={handleRegister}
                disabled={saving}
              >
                {saving ? "Registering..." : `Register for ${cycleName} →`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}