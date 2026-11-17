// src/pages/login/L03SignIn2.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor, RegistrationStatus } from "../../api/types";
import { formatDate } from "../../api/format";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TIME_WINDOWS = [
  {
    value: "Morning (8:00 AM - 12:00 PM)",
    label: "Morning",
    sub: "8:00 AM to 12:00 PM",
  },
  {
    value: "Afternoon (12:00 PM - 4:00 PM)",
    label: "Afternoon",
    sub: "12:00 PM to 4:00 PM",
  },
  {
    value: "Evening (4:00 PM - 8:00 PM)",
    label: "Evening",
    sub: "4:00 PM to 8:00 PM",
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
  const [registration, setRegistration] = useState<RegistrationStatus | null>(
    null
  );
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
        navigate("/login/signin");
        return;
      }
      setUser(sessionUser);

      try {
        setRegistration(await facultyApi.registrationStatus());
      } catch {
        // Committee accounts may not have a personal faculty registration record
      }
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
      setError("");
      void loadPage();
    };

    window.addEventListener("demo-reset", handleDemoReset);

    return () => {
      window.removeEventListener("demo-reset", handleDemoReset);
    };
  }, []);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleWindow = (win: string) => {
    setSelectedWindows((prev) =>
      prev.includes(win) ? prev.filter((w) => w !== win) : [...prev, win]
    );
  };

  const isRegistered = registration?.is_registered ?? false;

  const isPastDeadline =
    !isRegistered &&
    !!registration &&
    registration.today > registration.signup_deadline;

  const isCommittee = user?.role === "admin";
  const cycleName = registration?.cycle_name || "Current Evaluation Cycle";
  const facultyDestination = redirectTo || "/shared/faculty-dashboard";

  const firstName = (() => {
    if (!user) return "";
    const rec = user as unknown as Record<string, unknown>;
    if (typeof rec.first_name === "string" && rec.first_name.trim()) {
      return rec.first_name.trim();
    }
    if (typeof rec.full_name === "string" && rec.full_name.trim()) {
      return rec.full_name.trim().split(" ")[0];
    }
    if (typeof rec.name === "string" && rec.name.trim()) {
      return rec.name.trim().split(" ")[0];
    }
    return "";
  })();

  const handleRegister = async () => {
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
      navigate(facultyDestination);
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

  /* =========================================================
     COMMITTEE MEMBER WELCOME VIEW
     ========================================================= */
  if (isCommittee) {
    return (
      <div className="dashboard-container">
        <div className="l03-wrapper">
          <div className="l03-hero-header">
            <span className="a01-phase-pill">Assessment Committee</span>
            <h2>Welcome back{firstName ? `, ${firstName}` : ""}</h2>
            <p className="l03-subtitle">
              Here is a quick look at the {cycleName} schedule before you head
              into your workspace.
            </p>
          </div>

          {error && (
            <div role="alert" className="empty-state-banner s04-zero-margin">
              <strong>Error:</strong> {error}
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
                  <span className="l03-date-label">Faculty Signup Cutoff:</span>
                  <span className="l03-date-val">
                    {formatDate(registration.signup_deadline)}
                  </span>
                </div>
              </div>
            )}

            <div className="l03-two-col">
              <div className="l03-col-section">
                <div className="l03-section-head">
                  <span className="a01-phase-pill">Good to Know</span>
                  <h3 className="registration-title">Your Committee Role</h3>
                </div>

                <p className="l03-role-desc">
                  As an Assessment Committee member, you are exempt from
                  personal course registration. Your dashboard brings together
                  pairing approvals, unmatched faculty follow-ups, record
                  audits, and cycle KPIs in one place.
                </p>

                <p className="l03-avail-hint">
                  Need a refresher on any tool? You can expand the guide at the
                  top of your dashboard whenever you like.
                </p>
              </div>

              <div className="l03-col-section is-right">
                <div className="l03-section-head">
                  <span className="a01-phase-pill">Helpful Reminders</span>
                  <h3 className="registration-title">This Semester</h3>
                </div>

                <div className="l03-admin-notes">
                  <div className="l03-admin-note-card">
                    <span className="l03-field-label">Early Cycle</span>
                    <p className="l03-role-desc">
                      Review incoming course signups and release observer
                      lists so faculty can schedule their classroom visits.
                    </p>
                  </div>

                  <div className="l03-admin-note-card">
                    <span className="l03-field-label">Mid to Late Cycle</span>
                    <p className="l03-role-desc">
                      Keep an eye on unsigned observation records and post-visit
                      survey completion before closing out the semester.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="l03-footer-bar">
              <Link
                to="/shared/faculty-dashboard"
                className="registration-link"
              >
                View General Overview
              </Link>

              <button
                type="button"
                className="btn-primary l03-primary-cta"
                onClick={() => navigate(redirectTo || "/committee/dashboard")}
              >
                Go to Committee Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     FACULTY WELCOME VIEW
     ========================================================= */
  return (
    <div className="dashboard-container">
      <div className="l03-wrapper">
        <div className="l03-hero-header">
          <span className="a01-phase-pill">Peer Evaluation Portal</span>
          <h2>Welcome{firstName ? `, ${firstName}` : ""}</h2>
          <p className="l03-subtitle">
            Take a quick moment to check this semester&apos;s dates and let us know
            when you are free to observe colleagues.
          </p>
        </div>

        {error && (
          <div role="alert" className="empty-state-banner s04-zero-margin">
            <strong>Error:</strong> {error}
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
                <span className="l03-date-label">Signup Deadline:</span>
                <span className="l03-date-val">
                  {formatDate(registration.signup_deadline)}
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

              <div className="l03-role-list">
                <div className="l03-role-item is-observee">
                  <span className="pill-badge pill-observee">Being Observed</span>
                  <p className="l03-role-desc">
                    If you are due for evaluation this semester, you will pick{" "}
                    <strong>one class section</strong> and invite colleagues
                    from your matched list to visit.
                  </p>
                </div>

                <div className="l03-role-item is-observer">
                  <span className="pill-badge pill-observer">Observing Peers</span>
                  <p className="l03-role-desc">
                    Joining the cycle also adds you to the observer pool so you
                    can accept <strong>1 to 3 peer visits</strong> that fit your
                    teaching schedule.
                  </p>
                </div>
              </div>

              <p className="l03-avail-hint">
                Not due for evaluation this semester? You can skip registration
                below and head straight to your dashboard to check your status.
              </p>
            </div>

            <div className="l03-col-section is-right">
              <div className="l03-section-head">
                <span className="a01-phase-pill">Optional Setup</span>
                <h3 className="registration-title">Your Preferred Schedule</h3>
              </div>

              <p className="l03-avail-hint">
                Share the days and times that usually work best for you to
                observe a class. You can always change this later in{" "}
                <Link to="/shared/profile" className="s04-inline-link">
                  My Profile
                </Link>
                .
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
                  className="l03-notes-input"
                  placeholder="e.g., Free after 11:00 AM on Mon and Wed"
                  value={availabilityNotes}
                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isRegistered ? (
            <div className="l03-footer-bar">
              <div className="feedback-banner-success s04-zero-margin">
                <strong>You are all set:</strong> You are already registered
                for {cycleName}.
              </div>

              <button
                type="button"
                className="btn-primary l03-primary-cta"
                onClick={() => navigate(facultyDestination)}
              >
                {redirectTo ? "Continue to Requested Page →" : "Go to My Dashboard →"}
              </button>
            </div>
          ) : isPastDeadline ? (
            <div className="l03-footer-bar">
              <div className="empty-state-banner s04-zero-margin">
                <strong>Signup Closed:</strong> The registration window for{" "}
                {cycleName} has ended.
              </div>

              <button
                type="button"
                className="btn-primary l03-primary-cta"
                onClick={() => navigate(facultyDestination)}
              >
                {redirectTo ? "Continue to Requested Page →" : "Go to My Dashboard →"}
              </button>
            </div>
          ) : (
            <div className="l03-footer-bar">
              <div className="registration-link-container">
                <span className="l03-avail-hint">Not due this semester? </span>
                <Link to={facultyDestination} className="registration-link">
                  {redirectTo ? "Skip to Requested Page" : "Skip to My Dashboard"}
                </Link>
              </div>

              <button
                type="button"
                className="btn-primary l03-primary-cta"
                onClick={handleRegister}
                disabled={saving}
              >
                {saving ? "Registering..." : `Join ${cycleName} Cycle`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}