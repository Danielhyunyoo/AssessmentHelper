// src/pages/login/L03SignIn2.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor, RegistrationStatus } from "../../api/types";
import { formatDate } from "../../api/format";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TIME_WINDOWS = [
  {
    value: "Morning (8:00 AM – 12:00 PM)",
    label: "Morning",
    sub: "8 AM – 12 PM",
  },
  {
    value: "Afternoon (12:00 PM – 4:00 PM)",
    label: "Afternoon",
    sub: "12 PM – 4 PM",
  },
  {
    value: "Evening (4:00 PM – 8:00 PM)",
    label: "Evening",
    sub: "4 PM – 8 PM",
  },
];

const AVAILABILITY_STORAGE_KEY = "observer_availability_v1";

export default function L03SignIn2() {
  const navigate = useNavigate();

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
        : ["Morning (8:00 AM – 12:00 PM)"];
    } catch {
      return ["Morning (8:00 AM – 12:00 PM)"];
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

      if (sessionUser.role === "admin") {
        navigate("/committee/dashboard");
        return;
      }

      setRegistration(await facultyApi.registrationStatus());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load registration information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
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
      navigate("/shared/faculty-dashboard");
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
          <div className="a07-state-box">
            Loading {cycleName} registration...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="l03-wrapper">
        {/* Compact Header */}
        <div className="l03-hero-header">
          <span className="a01-phase-pill">Faculty Cycle Registration</span>
          <h2>{cycleName} Evaluation Cycle</h2>
          <p className="l03-subtitle">
            Confirm your dual-role participation and set your general availability
            to observe peers.
          </p>
        </div>

        {error && (
          <div role="alert" className="empty-state-banner s04-zero-margin">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Card */}
        <div className="registration-card">
          {/* Inline Key Dates Strip */}
          {registration && (
            <div className="l03-dates-bar">
              <div className="l03-date-pair">
                <span className="l03-date-label">Cycle Window:</span>
                <span className="l03-date-val">
                  {formatDate(registration.start_date)} –{" "}
                  {formatDate(registration.end_date)}
                </span>
              </div>

              <span className="l03-date-divider" aria-hidden="true">
                |
              </span>

              <div className="l03-date-pair">
                <span className="l03-date-label">Registration Deadline:</span>
                <span className="l03-date-val">
                  {formatDate(registration.signup_deadline)}
                </span>
              </div>
            </div>
          )}

          {isRegistered ? (
            <>
              <div className="feedback-banner-success s04-zero-margin">
                <strong>Registered:</strong> You are enrolled for the{" "}
                {cycleName} cycle. Customize specific dates anytime in{" "}
                <Link to="/shared/profile" className="s04-inline-link">
                  My Profile
                </Link>
                .
              </div>

              <div className="l03-footer-bar">
                <Link
                  to="/shared/current-past-observations"
                  className="registration-link"
                >
                  View Current &amp; Past Observations
                </Link>
                <button
                  type="button"
                  className="btn-primary l03-primary-cta"
                  onClick={() => navigate("/shared/faculty-dashboard")}
                >
                  Go to Faculty Dashboard →
                </button>
              </div>
            </>
          ) : isPastDeadline ? (
            <>
              <div className="empty-state-banner s04-zero-margin">
                <strong>Registration Closed:</strong> The deadline to register
                for the {cycleName} evaluation cycle has passed.
              </div>

              <p className="l03-role-desc">
                You were not registered for an observation visit during this
                active cycle, though you can still access your historical
                evaluation records.
              </p>

              <div className="l03-footer-bar">
                <Link
                  to="/shared/current-past-observations"
                  className="btn-secondary"
                >
                  View Previous Observation Records
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="l03-two-col">
                {/* Left Column: Dual-Role Participation */}
                <div className="l03-col-section">
                  <div className="l03-section-head">
                    <span className="a01-phase-pill">Participation</span>
                    <h3 className="registration-title">
                      What Registration Includes
                    </h3>
                  </div>

                  <div className="l03-role-list">
                    <div className="l03-role-item is-observee">
                      <span className="pill-badge pill-observee">Observee</span>
                      <p className="l03-role-desc">
                        Select one course section to receive a peer visit and
                        invite eligible colleagues.
                      </p>
                    </div>

                    <div className="l03-role-item is-observer">
                      <span className="pill-badge pill-observer">Observer</span>
                      <p className="l03-role-desc">
                        Enroll as a peer observer to review requests, visit a
                        colleague&apos;s class, and submit feedback.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Observer Availability */}
                <div className="l03-col-section is-right">
                  <div className="l03-section-head">
                    <span className="a01-phase-pill">Scheduling</span>
                    <h3 className="registration-title">
                      Observer Availability
                    </h3>
                  </div>

                  <div className="l03-field-block">
                    <div className="l03-field-row">
                      <span className="l03-field-label">Days</span>
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
                  </div>

                  <div className="l03-field-block">
                    <span className="l03-field-label">Time Windows</span>
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
                    <label
                      htmlFor="l03-avail-notes"
                      className="l03-field-label"
                    >
                      Additional Notes (Optional)
                    </label>
                    <input
                      id="l03-avail-notes"
                      type="text"
                      className="l03-notes-input"
                      placeholder="e.g., Available after 11:00 AM on MWF"
                      value={availabilityNotes}
                      onChange={(e) => setAvailabilityNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Aligned Footer Bar */}
              <div className="l03-footer-bar">
                <div className="registration-link-container">
                  <span className="l03-avail-hint">
                    Not participating in this cycle?{" "}
                  </span>
                  <Link
                    to="/shared/current-past-observations"
                    className="registration-link"
                  >
                    View previous records
                  </Link>
                </div>

                <button
                  type="button"
                  className="btn-primary l03-primary-cta"
                  onClick={handleRegister}
                  disabled={saving}
                >
                  {saving ? "Registering..." : `Register for ${cycleName} Cycle`}
                </button>
              </div>
            </>
          )}

          {isCommittee && (
            <div className="committee-section">
              <h4 className="committee-title">Assessment Committee Access</h4>
              <p className="committee-desc">
                Access to Assessment Committee tools is configured automatically
                based on your staff credentials.
              </p>

              <Link
                to="/committee/dashboard"
                className="btn-secondary"
                style={{ marginTop: "0.75rem" }}
              >
                Go to Assessment Committee Portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}