// src/pages/login/L01Home.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import campus from "../../assets/card-stock-images/campus.png";
import course_and_section_selection_card from "../../assets/card-stock-images/course_and_section_selection_card.jpg";
import current_and_past_observations_card from "../../assets/card-stock-images/current_and_past_observations_card.jpg";
import observation_record_management_card from "../../assets/card-stock-images/observation_record_management_card.jpg";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor } from "../../api/types";
import { isUserTransferredToNextCycle } from "../committee/A02FacultyMatching";

const UNREGISTERED_ALLOWED_PATHS = [
  "/login/signin2",
  "/shared/current-past-observations",
  "/shared/contact-committee",
];

export default function L01Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState<Professor | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isTransferred, setIsTransferred] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeState() {
      try {
        const { professor } = await authApi.session();
        if (cancelled) return;

        setUser(professor);

        if (professor) {
          if (professor.role === "admin") {
            setIsRegistered(true);
            setIsTransferred(false);
            return;
          }

          try {
            const status = await facultyApi.registrationStatus();
            if (!cancelled) {
              const transferred = isUserTransferredToNextCycle(
                professor,
                status
              );
              setIsTransferred(transferred);
              setIsRegistered(Boolean(status.is_registered) && !transferred);
            }
          } catch {
            if (!cancelled) {
              const transferred = isUserTransferredToNextCycle(professor, null);
              setIsTransferred(transferred);
              setIsRegistered(false);
            }
          }
        } else {
          setIsRegistered(false);
          setIsTransferred(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsRegistered(false);
          setIsTransferred(false);
        }
      }
    }

    void loadHomeState();

    window.addEventListener("cycle-transfers-updated", loadHomeState);
    window.addEventListener("demo-reset", loadHomeState);
    return () => {
      cancelled = true;
      window.removeEventListener("cycle-transfers-updated", loadHomeState);
      window.removeEventListener("demo-reset", loadHomeState);
    };
  }, []);

  const isLoggedIn = user !== null;
  const isCommittee = user?.role === "admin";
  const hasFullPortalAccess = isCommittee || isRegistered;

  const handleFacultyButtonClick = () => {
    if (!hasFullPortalAccess) {
      navigate("/login/signin2");
    } else {
      navigate("/shared/faculty-dashboard");
    }
  };

  const handleProtectedNavigate = (targetPath: string) => {
    if (!isLoggedIn) {
      navigate("/login/signin", { state: { redirectTo: targetPath } });
      return;
    }

    const isRecordDetail = targetPath.startsWith("/shared/observation-record/");
    const isAllowedForUnregistered =
      UNREGISTERED_ALLOWED_PATHS.includes(targetPath) || isRecordDetail;

    if (!hasFullPortalAccess && !isAllowedForUnregistered) {
      navigate("/login/signin2");
      return;
    }

    navigate(targetPath);
  };

  return (
    <div className="home-container">
      {/* Main Hero Section */}
      <div className="home-main-card">
        <div className="home-content">
          <div className="home-text">
            <div className="home-badge-pill">UT Dallas Faculty Portal</div>
            <h1 className="home-title">UTD Assessment Helper</h1>
            <p className="home-subtitle">
              Register your courses, coordinate classroom observation schedules, and complete peer evaluation records all in one workplace.
            </p>

            <div className="home-actions">
              {!isLoggedIn && (
                <Link to="/login/signin" className="btn-primary home-main-btn">
                  Sign In with UTD Email
                </Link>
              )}

              {isLoggedIn && isCommittee && (
                <>
                  <Link
                    to="/committee/dashboard"
                    className="btn-primary btn-block home-main-btn"
                  >
                    Assessment Committee Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleFacultyButtonClick}
                    className="btn-secondary btn-block home-committee-btn"
                  >
                    Faculty Overview
                  </button>
                </>
              )}

              {isLoggedIn && !isCommittee && (
                <button
                  type="button"
                  onClick={handleFacultyButtonClick}
                  className="btn-primary btn-block home-main-btn"
                >
                  {hasFullPortalAccess
                    ? "Go to Faculty Dashboard"
                    : isTransferred
                    ? "View Cycle Transfer Status"
                    : "Complete Cycle Registration"}
                </button>
              )}
            </div>
          </div>

          <div className="home-image-container">
            <img src={campus} alt="UT Dallas Campus" className="campus-img" />
          </div>
        </div>
      </div>

      {/* Feature Modules Grid */}
      <section className="home-modules-section">
        <span className="a01-phase-pill">Quick Workspace Access</span>

        <div className="home-info-footer-grid">
          <div className="home-info-box">
            <div className="home-box-img-frame">
              <img
                src={course_and_section_selection_card}
                alt="Course Registration"
                className="home-box-img"
              />
            </div>
            <h4>Course and Section Registration</h4>
            <p>
              Select active course sections and submit proposed observation dates aligned with departmental deadlines.
            </p>
            <button
              type="button"
              onClick={() =>
                handleProtectedNavigate("/observee/course-selection")
              }
              className="btn-secondary home-box-btn"
            >
              Select Courses
            </button>
          </div>

          <div className="home-info-box">
            <div className="home-box-img-frame">
              <img
                src={observation_record_management_card}
                alt="Observation Requests"
                className="home-box-img"
              />
            </div>
            <h4>Observation Requests</h4>
            <p>
              Review incoming peer observation assignments, accept requests, and manage evaluation schedules.
            </p>
            <button
              type="button"
              onClick={() =>
                handleProtectedNavigate("/observer/observation-request")
              }
              className="btn-secondary home-box-btn"
            >
              Review Requests
            </button>
          </div>

          <div className="home-info-box">
            <div className="home-box-img-frame">
              <img
                src={current_and_past_observations_card}
                alt="Historical Archives"
                className="home-box-img"
              />
            </div>
            <h4>Historical Archives</h4>
            <p>
              Access past evaluation records and track institutional progress securely across evaluation cycles.
            </p>
            <button
              type="button"
              onClick={() =>
                handleProtectedNavigate("/shared/current-past-observations")
              }
              className="btn-secondary home-box-btn"
            >
              Access Past Records
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}