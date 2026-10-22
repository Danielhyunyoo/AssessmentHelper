// src/components/Header.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/brand-symbol.png";
import home from "../assets/home_icon.png";
import bell from "../assets/default_bell_icon.png";
import icon from "../assets/profile_icon.png";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header>
        {/* Static Non-Clickable Brand Header */}
        <div id="logo">
          <img src={logo} alt="UTD Logo" className="header-logo" />
          <h1>UTD Assessment Helper</h1>
        </div>

        <nav id="user-shortcuts">
          <Link to="/" title="Go to Home" onClick={closeMenu}>
            <img className="icon" src={home} alt="Home" />
          </Link>
          <img className="icon" src={bell} alt="Notifications" />
          <img className="icon" src={icon} alt="Profile" />

          {/* Hamburger Menu Toggle Button */}
          <button 
            type="button" 
            className="hamburger-btn" 
            onClick={toggleMenu}
            aria-label="Toggle Navigation Menu"
          >
            &#9776;
          </button>
        </nav>
      </header>

      {/* Slide-over Drawer Menu */}
      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeMenu}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Navigation Menu</h3>
              <button type="button" className="close-btn" onClick={closeMenu}>
                &times;
              </button>
            </div>

            <div className="menu-body">
              {/* Quick Role / Dashboard Switcher */}
              <div className="menu-section">
                <h4>Switch Dashboards</h4>
                <Link to="/committee/dashboard" onClick={closeMenu}>
                  Assessment Committee Dashboard
                </Link>
                <Link to="/shared/faculty-dashboard" onClick={closeMenu}>
                  Faculty Dashboard
                </Link>
              </div>

              {/* Committee Shortcuts */}
              <div className="menu-section">
                <h4>Committee Workflows</h4>
                <Link to="/committee/faculty-matching" onClick={closeMenu}>
                  Faculty Matching
                </Link>
                <Link to="/committee/unmatched-observees" onClick={closeMenu}>
                  Unmatched Observees
                </Link>
                <Link to="/committee/faculty-roster" onClick={closeMenu}>
                  Faculty Roster Management
                </Link>
                <Link to="/committee/form-editor" onClick={closeMenu}>
                  Form Editor
                </Link>
              </div>

              {/* Observee & Observer Shortcuts */}
              <div className="menu-section">
                <h4>Observee & Observer Modules</h4>
                <Link to="/observee/course-selection" onClick={closeMenu}>
                  Course Section Selection
                </Link>
                <Link to="/observee/current-past-observations" onClick={closeMenu}>
                  Current / Past Observations
                </Link>
                <Link to="/observer/active-observations" onClick={closeMenu}>
                  Active Observations
                </Link>
              </div>

              {/* Account / Session Links */}
              <div className="menu-section">
                <h4>Account</h4>
                <Link to="/login/signin" onClick={closeMenu} className="menu-signout">
                  Sign Out
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}