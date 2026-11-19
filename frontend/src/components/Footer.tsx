// src/components/Footer.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import utdLogo from "../assets/icons/utd_logo.png";
import { authApi, facultyApi } from "../api/endpoints";
import type { Professor } from "../api/types";
import { isUserTransferredToNextCycle } from "../pages/committee/A02FacultyMatching";

export default function Footer() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [isCycleRegistered, setIsCycleRegistered] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function syncFooterAccess() {
      try {
        const { professor } = await authApi.session();
        if (cancelled) return;

        setCurrentUser(professor ?? null);

        if (!professor) {
          setIsCycleRegistered(false);
          return;
        }

        if (professor.role === "admin") {
          setIsCycleRegistered(true);
          return;
        }

        const reg = await facultyApi
          .registrationStatus()
          .catch(() => ({ is_registered: false }));
        if (!cancelled) {
          const transferred = isUserTransferredToNextCycle(
            professor,
            reg as never
          );
          setIsCycleRegistered(Boolean(reg.is_registered) && !transferred);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
          setIsCycleRegistered(false);
        }
      }
    }

    void syncFooterAccess();

    window.addEventListener("registration-changed", syncFooterAccess);
    window.addEventListener("cycle-transfers-updated", syncFooterAccess);
    window.addEventListener("demo-reset", syncFooterAccess);

    return () => {
      cancelled = true;
      window.removeEventListener("registration-changed", syncFooterAccess);
      window.removeEventListener("cycle-transfers-updated", syncFooterAccess);
      window.removeEventListener("demo-reset", syncFooterAccess);
    };
  }, [location.pathname]);

  const storedRole = sessionStorage.getItem("ac_user_role") || "";
  const isCommitteeMode =
    currentUser?.role === "admin" ||
    location.pathname.startsWith("/committee") ||
    storedRole.toLowerCase().includes("committee");

  const isRestrictedFaculty =
    currentUser !== null && !isCommitteeMode && !isCycleRegistered;

  const dashboardPath = isCommitteeMode
    ? "/committee/dashboard"
    : isRestrictedFaculty
    ? "/login/signin2"
    : "/shared/faculty-dashboard";

  const notificationsPath = isRestrictedFaculty
    ? "/login/signin2"
    : "/shared/notifications";

  return (
    <footer className="footer-container">
      <div className="footer-inner">
        {/* Left Column: Logo, Copyright, and Institutional Info */}
        <div className="footer-left-col">
          <div className="footer-brand">
            <img
              src={utdLogo}
              alt="UTD Assessment Helper Logo"
              className="footer-logo"
            />
            <span className="footer-title">UTD Assessment Helper</span>
          </div>

          <div className="footer-copyright-block">
            <p className="footer-copyright">
              Copyright &copy; 2026 UTD Assessment Helper Team 10.
            </p>
            <p className="footer-copyright">All rights reserved.</p>
          </div>

          <div className="footer-meta-row">
            <span>The University of Texas at Dallas</span>
          </div>
        </div>

        {/* Right Column: Working Navigation Links and Support Link */}
        <div className="footer-right-col">
          <nav className="footer-nav-links" aria-label="Footer navigation">
            <Link to={dashboardPath} className="footer-nav-link">
              Dashboard
            </Link>
            <Link to={notificationsPath} className="footer-nav-link">
              Notifications
            </Link>
            <Link to="/shared/profile" className="footer-nav-link">
              Profile
            </Link>
            <a
              href="mailto:assessment-committee@utdallas.edu?subject=UTD%20Assessment%20Helper%20Support"
              className="footer-nav-link"
              title="Opens your default email app to email assessment-committee@utdallas.edu"
              aria-label="Email Assessment Committee via your email client"
            >
              Email Assessment Committee ↗
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}