// src/pages/login/L03SignIn2.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function L03SignIn2() {
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState<"faculty" | "committee">("committee");
  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    return localStorage.getItem("isRegisteredForCycle") === "true";
  });
  const [isPastDeadline, setIsPastDeadline] = useState<boolean>(false);

  const handleRegister = () => {
    localStorage.setItem("isRegisteredForCycle", "true");
    setIsRegistered(true);
    navigate("/shared/faculty-dashboard");
  };

  const handleRegistrationToggle = (checked: boolean) => {
    setIsRegistered(checked);
    localStorage.setItem("isRegisteredForCycle", checked ? "true" : "false");
  };

  return (
    <div className="dashboard-container" style={{ alignItems: "center", paddingTop: "3rem" }}>
      <h2>Fall 2026 Evaluation Cycle</h2>
      <p style={{ color: "#475569", marginTop: "-0.5rem", marginBottom: "1.5rem" }}>
        You are registering for the upcoming peer observation cycle.
      </p>

      <div className="table-container registration-card">
        {isRegistered ? (
          <>
            <div className="yellow-banner" style={{ marginBottom: "1rem" }}>
              <strong>Cycle Status:</strong> You are registered for the Fall 2026 cycle.
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
              ⚠️ <strong>Registration Closed:</strong> The deadline to register for the Fall 2026 evaluation cycle has passed.
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

            <button type="button" className="btn-primary btn-block" onClick={handleRegister}>
              Register for Fall 2026 Cycle
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

        {userRole === "committee" && (
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

        {/* Demo State Simulator */}
        <div
          style={{
            marginTop: "2.5rem",
            padding: "1rem",
            backgroundColor: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: "12px",
            textAlign: "left",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            Demo State Simulator
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: "600" }}>User Role Permissions:</span>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as "faculty" | "committee")}
                style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="committee">Both (Faculty & Committee)</option>
                <option value="faculty">Regular Faculty Only</option>
              </select>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isRegistered}
                onChange={(e) => handleRegistrationToggle(e.target.checked)}
              />
              <strong>Cycle Registered:</strong> {isRegistered ? "True" : "False"}
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                opacity: isRegistered ? 0.5 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={isPastDeadline}
                disabled={isRegistered}
                onChange={(e) => setIsPastDeadline(e.target.checked)}
              />
              <strong>Missed Deadline (Unregistered):</strong> {isPastDeadline ? "True" : "False"}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}