// src/pages/login/L01Home.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import campus from "../../assets/campus.png";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor } from "../../api/types";

export default function L01Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState<Professor | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  useEffect(() => {
    authApi
      .session()
      .then(async ({ professor: sessionUser }) => {
        setUser(sessionUser);
        if (sessionUser) setIsRegistered((await facultyApi.registrationStatus()).is_registered);
      })
      .catch(() => setUser(null));
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

  return (
    <div className="home-container">
      <div className="home-content">
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
            {!isLoggedIn && (
              <Link to="/login/signin" className="btn-primary">
                Sign in
              </Link>
            )}

            {isLoggedIn && (
              <button
                type="button"
                onClick={handleFacultyButtonClick}
                className="btn-primary btn-block"
              >
                {!isRegistered ? "Register for Cycle / Faculty Dashboard" : "Faculty Dashboard"}
              </button>
            )}

            {isCommittee && (
              <Link
                to="/committee/dashboard"
                className="btn-secondary btn-block"
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
  );
}