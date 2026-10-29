// src/pages/login/L03SignIn2.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor, RegistrationStatus } from "../../api/types";

export default function L03SignIn2() {
  const navigate = useNavigate();

  const [user, setUser] = useState<Professor | null>(null);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      setRegistration(await facultyApi.registrationStatus());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load registration information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const isRegistered = registration?.is_registered ?? false;

  const todayAsIsoDate = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  const isPastDeadline =
    !isRegistered &&
    !!registration &&
    todayAsIsoDate > registration.signup_deadline;

  const isCommittee = user?.role === "admin";
  const cycleName = registration?.cycle_name || "Current Evaluation Cycle";

  const handleRegister = async () => {
    setSaving(true);
    setError("");

    try {
      await facultyApi.register();
      navigate("/shared/faculty-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register for the cycle.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ alignItems: "center", paddingTop: "3rem" }}>
        <h2>{cycleName} Evaluation Cycle</h2>
        <p>Loading your registration...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ alignItems: "center", paddingTop: "3rem" }}>
      <h2>{cycleName} Evaluation Cycle</h2>
      <p style={{ color: "#475569", marginTop: "-0.5rem", marginBottom: "0.75rem" }}>
        You are viewing the registration status for the current evaluation cycle.
      </p>

      {registration && (
        <div
          className="table-instruction"
          style={{ marginBottom: "1.5rem", width: "100%", maxWidth: "600px" }}
        >
          <p>
            <strong>Cycle dates:</strong>{" "}
            {new Date(`${registration.start_date}T00:00:00`).toLocaleDateString()} –{" "}
            {new Date(`${registration.end_date}T00:00:00`).toLocaleDateString()}
          </p>
          <p>
            <strong>Registration deadline:</strong>{" "}
            {new Date(`${registration.signup_deadline}T00:00:00`).toLocaleDateString()}
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="yellow-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="table-container registration-card">
        {isRegistered ? (
          <>
            <div className="yellow-banner" style={{ marginBottom: "1rem" }}>
              <strong>Cycle Status:</strong> You are registered for the {cycleName} cycle.
            </div>

            <button
              type="button"
              className="btn-primary btn-block"
              onClick={() => navigate("/shared/faculty-dashboard")}
            >
              Go to Faculty Dashboard
            </button>

            <div className="registration-link-container">
              <Link to="/observee/current-past-observations" className="registration-link">
                View Previous Observation Records
              </Link>
            </div>
          </>
        ) : isPastDeadline ? (
          <>
            <div
              className="yellow-banner"
              style={{
                marginBottom: "1rem",
                backgroundColor: "#fee2e2",
                borderLeftColor: "#ef4444",
                color: "#991b1b",
              }}
            >
              ⚠️ <strong>Registration Closed:</strong> The deadline to register for the {cycleName} evaluation cycle has passed.
            </div>

            <p style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "1rem" }}>
              You were not registered for an observation visit during this active cycle. You can still access your historical records.
            </p>

            <Link to="/observee/current-past-observations" className="btn-secondary btn-block">
              View Previous Observation Records
            </Link>
          </>
        ) : (
          <>
            <h3 className="registration-title">What this registration includes:</h3>

            <ul className="registration-list">
              <li>
                <strong>Observee Role:</strong> You must select one active course section to receive a peer observation visit this cycle.
              </li>
              <li>
                <strong>Observer Role:</strong> You are automatically enrolled as an Observer to evaluate fellow faculty members.
              </li>
            </ul>

            <button type="button" className="btn-primary btn-block" onClick={handleRegister} disabled={saving}>
              {saving ? "Registering..." : `Register for ${cycleName} Cycle`}
            </button>

            <div className="registration-link-container">
              <p style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "0.25rem" }}>
                Not registering for this cycle?
              </p>
              <Link to="/observee/current-past-observations" className="registration-link">
                View previous records
              </Link>
            </div>
          </>
        )}

        {isCommittee && (
          <div className="committee-section">
            <h4 className="committee-title">ASSESSMENT COMMITTEE ONLY:</h4>
            <p className="committee-desc">
              Please note that access to the Assessment Committee functions is configured automatically based on your staff credentials.
            </p>

            <Link to="/committee/dashboard" className="btn-secondary btn-block" style={{ marginTop: "0.75rem" }}>
              Go to Assessment Committee Portal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}