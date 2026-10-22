// src/components/Footer.jsx
import logo from "../assets/brand-symbol.png";

export default function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-brand">
        <img src={logo} alt="Logo" className="footer-logo" />
        <span className="footer-title">UTD Assessment Helper</span>
      </div>
      
      <div className="footer-info">
        <span className="footer-version">Version 1.0</span>
        <span className="footer-copyright">
          &copy; 2026 UTD Assessment Helper Team 10. All rights reserved.
        </span>
      </div>
    </footer>
  );
}