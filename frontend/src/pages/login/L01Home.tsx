// src/pages/login/L01Home.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import campus from "../../assets/campus.png";

export default function L01Home() {
  const navigate = useNavigate();

  // Demo State: Toggles for live demonstration before backend auth is implemented
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<"faculty" | "committee">("committee");

  // Registration state for current evaluation cycle
  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    return localStorage.getItem("isRegisteredForCycle") === "true";
  });

  // Keep local state in sync with localStorage when toggling in demo panel
  const handleRegistrationToggle = (checked: boolean) => {
    setIsRegistered(checked);
    localStorage.setItem("isRegisteredForCycle", checked ? "true" : "false");
  };

  // Smart action for Faculty button
  const handleFacultyButtonClick = () => {
    if (!isRegistered) {
      navigate("/login/faculty-registration");
    } else {
      navigate("/shared/faculty-dashboard");
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        {/* Left Column: Title, Subtitle, and Conditional Action Buttons */}
        <div className="home-text">
          <h1 className="home-title">
            Sign into UTD<br />
            Assessment<br />
            Helper
          </h1>
          <p className="home-subtitle">
            Register your courses, review observation<br />
            requests, and submit evaluation records.
          </p>

          <div className="home-actions" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* 1. Show "Sign in" button when NOT logged in */}
            {!isLoggedIn && (
              <Link to="/login/signin" className="home-signin-btn">
                Sign in
              </Link>
            )}

            {/* 2. Show "Register / Faculty Dashboard" when logged in */}
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleFacultyButtonClick}
                className="home-signin-btn"
                style={{ textAlign: "center", border: "none", cursor: "pointer", width: "100%" }}
              >
                {!isRegistered ? "Register for Cycle / Faculty Dashboard" : "Faculty Dashboard"}
              </button>
            )}

            {/* 3. Show "Assessment Committee Dashboard" ONLY when logged in AND user is Committee */}
            {isLoggedIn && userRole === "committee" && (
              <Link
                to="/committee/dashboard"
                className="home-signin-btn"
                style={{ backgroundColor: "#1e293b", textAlign: "center" }}
              >
                Assessment Committee Dashboard
              </Link>
            )}
          </div>

          {/* ==========================================
              DEMO TOGGLE PANEL (For presentation / testing)
              ========================================== */}
          <div
            style={{
              marginTop: "2.5rem",
              padding: "1rem",
              backgroundColor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "12px",
              maxWidth: "360px",
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Demo State Simulator
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
              {/* Toggle Login State */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isLoggedIn}
                  onChange={(e) => setIsLoggedIn(e.target.checked)}
                />
                <strong>Logged In:</strong> {isLoggedIn ? "True" : "False"}
              </label>

              {/* Role Selector (Disabled if logged out) */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", opacity: isLoggedIn ? 1 : 0.5 }}>
                <span style={{ fontWeight: "600" }}>User Role:</span>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as "faculty" | "committee")}
                  disabled={!isLoggedIn}
                  style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="faculty">Faculty Only</option>
                  <option value="committee">Assessment Committee Member</option>
                </select>
              </div>

              {/* Registration Status Toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", opacity: isLoggedIn ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={isRegistered}
                  disabled={!isLoggedIn}
                  onChange={(e) => handleRegistrationToggle(e.target.checked)}
                />
                <strong>Cycle Registered:</strong> {isRegistered ? "True" : "False"}
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Campus Image */}
        <div className="home-image-container">
          <img src={campus} alt="UTD Campus" className="campus-img" />
        </div>
      </div>
    </div>
  );
}