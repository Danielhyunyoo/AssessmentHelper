// src/pages/login/L01Home.tsx
import { Link } from "react-router-dom";
import campus from "../../assets/campus.png";

export default function L01Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-text">
          <h1>Sign into UTD Assessment Helper</h1>
          <p className="subtitle">
            Register your courses, review observation requests, and submit evaluation records.
          </p>

          <div className="demo-actions">
            <h3>Select Dashboard (Demo Access)</h3>
            <div className="button-group">
              <Link to="/committee/dashboard" className="primary-btn">
                Assessment Committee Dashboard (A01)
              </Link>
              <Link to="/shared/faculty-dashboard" className="secondary-btn">
                Faculty Dashboard (S01)
              </Link>
            </div>
          </div>
        </div>

        <div className="home-image-container">
          <img src={campus} alt="UTD Campus" className="campus-img" />
        </div>
      </div>
    </div>
  );
}