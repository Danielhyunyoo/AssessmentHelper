// src/pages/login/L02SignIn.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { authApi } from "../../api/endpoints"; // Connect backend auth API here later

export default function L02SignIn(): React.ReactElement {
  const navigate = useNavigate();

  // Form Field States
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [staySignedIn, setStaySignedIn] = useState<boolean>(true);

  // Status & Error States
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address (e.g., user@utdallas.edu).");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ==========================================
      // BACKEND CONNECTION PLACEHOLDER
      // ==========================================
      console.log("Submitting login payload:", {
        email,
        password,
        staySignedIn,
      });

      // Simulate API response time
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Route user to Faculty Dashboard after successful login
      navigate("/shared/faculty-dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page-container">
      <div className="signin-card">
        {error && (
          <div className="signin-error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="signin-form">
          {/* Email Field */}
          <div className="signin-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password Field */}
          <div className="signin-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Stay Signed In Checkbox */}
          <div className="signin-checkbox-container">
            <label className="signin-checkbox-label">
              <input
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
                disabled={loading}
              />
              <span>Stay Signed In</span>
            </label>
          </div>

          {/* Submit Button */}
          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}