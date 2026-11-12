// src/pages/login/L01Home.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import campus from "../../assets/campus.png";
import course_and_section_selection_card from "../../assets/course_and_section_selection_card.jpg";
import current_and_past_observations_card from "../../assets/current_and_past_observations_card.jpg";
import observation_record_management_card from "../../assets/observation_record_management_card.jpg";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor } from "../../api/types";

export default function L01Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState<Professor | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeState() {
      try {
        const { professor } = await authApi.session();

        if (cancelled) return;

        setUser(professor);

        if (professor) {
          try {
            const status = await facultyApi.registrationStatus();

            if (!cancelled) {
              setIsRegistered(status.is_registered);
            }
          } catch {
            // Keep the logged-in state even if registration status fails.
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    }

    void loadHomeState();

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = user !== null;
  const isCommittee = user?.role === "admin";

  const handleFacultyButtonClick = () => {
    if (!isRegistered) {
      navigate("/login/signin2");
    } else {
      navigate("/shared/faculty-dashboard");
    }
  };

  const handleProtectedNavigate = (targetPath: string) => {
    if (isLoggedIn) {
      navigate(targetPath);
    } else {
      navigate("/login/signin", { state: { redirectTo: targetPath } });
    }
  };

  return (
    <div className="home-container">
      <div className="home-main-card">
        <div className="home-content">
          <div className="home-text">
            <div className="home-badge-pill">UT Dallas Faculty Portal</div>
            <h1 className="home-title">
              Sign into UTD Assessment Helper
            </h1>
            <p className="home-subtitle">
              Register your courses, review observation requests, and submit evaluation records in one secure workspace.
            </p>

            <div className="home-actions">
              {!isLoggedIn && (
                <Link to="/login/signin" className="btn-primary home-main-btn">
                  Sign in
                </Link>
              )}

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={handleFacultyButtonClick}
                  className="btn-primary btn-block home-main-btn"
                >
                  {!isRegistered ? "Register for Cycle / Faculty Dashboard" : "Faculty Dashboard"}
                </button>
              )}

              {isCommittee && (
                <Link
                  to="/committee/dashboard"
                  className="btn-secondary btn-block home-committee-btn"
                >
                  Assessment Committee Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="home-image-container">
            <img src={campus} alt="UTD Campus" className="campus-img" />
          </div>
        </div>
      </div>

      <div className="home-info-footer-grid">
        <div className="home-info-box">
          <img src={course_and_section_selection_card} alt="Course Registration" className="home-box-img" />
          <h4>Course & Section Registration</h4>
          <p>Select active course sections and submit proposed observation dates aligned with departmental deadlines.</p>
          <button
            type="button"
            onClick={() => handleProtectedNavigate("/observee/course-selection")}
            className="btn-secondary home-box-btn"
          >
            Select Courses
          </button>
        </div>

        <div className="home-info-box">
          <img src={observation_record_management_card} alt="Observation Requests" className="home-box-img" />
          <h4>Observation Requests</h4>
          <p>Review incoming peer observation assignments, accept requests, and manage evaluation schedules.</p>
          <button
            type="button"
            onClick={() => handleProtectedNavigate("/observer/observation-request")}
            className="btn-secondary home-box-btn"
          >
            Review Requests
          </button>
        </div>

        <div className="home-info-box">
          <img src={current_and_past_observations_card} alt="Historical Archives" className="home-box-img" />
          <h4>Historical Archives</h4>
          <p>Access past evaluation records and track institutional progress securely across evaluation cycles.</p>
          <button
            type="button"
            onClick={() => handleProtectedNavigate("/shared/current-past-observations")}
            className="btn-secondary home-box-btn"
          >
            Access Past Records
          </button>
        </div>
      </div>
    </div>
  );
}