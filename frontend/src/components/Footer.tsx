// src/components/Footer.tsx
import { Link, useLocation } from "react-router-dom";
import darkModeLogo from "../assets/dark_mode_logo.png";

export default function Footer() {
  const location = useLocation();
  const storedRole = sessionStorage.getItem("ac_user_role") || "";
  const isCommitteeMode =
    location.pathname.startsWith("/committee") ||
    storedRole.toLowerCase().includes("committee");

  const dashboardPath = isCommitteeMode
    ? "/committee/dashboard"
    : "/shared/faculty-dashboard";

  return (
    <footer className="footer-container">
      <div className="footer-inner">
        {/* Left Column: Logo, Copyright & Institutional Info */}
        <div className="footer-left-col">
          <div className="footer-brand">
            <img src={darkModeLogo} alt="UTD Assessment Helper Logo" className="footer-logo" />
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

        {/* Right Column: Working Navigation Links + Support Pill */}
        <div className="footer-right-col">
          <nav className="footer-nav-links" aria-label="Footer navigation">
            <Link to={dashboardPath} className="footer-nav-link">
              Dashboard
            </Link>
            <Link to="/shared/notifications" className="footer-nav-link">
              Notifications
            </Link>
            <Link to="/shared/profile" className="footer-nav-link">
              Profile
            </Link>
            <a
              href="mailto:assessment-committee@utdallas.edu?subject=UTD%20Assessment%20Helper%20Support"
              className="footer-nav-link"
            >
              Contact Committee
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}