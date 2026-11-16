// src/pages/login/L02SignIn.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../api/endpoints";

interface LocationState {
  redirectTo?: string;
}

export default function L02SignIn(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.redirectTo;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [staySignedIn, setStaySignedIn] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
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
      await authApi.csrf();
      await authApi.login(email.trim(), password);
      navigate("/login/signin2", { state: redirectTo ? { redirectTo } : undefined });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page-container">
      <div className="signin-card">
        <div className="signin-header">
          <Link to="/" className="signin-back-link">
            ← Back to Portal Home
          </Link>
          <h1 className="signin-title">Sign In</h1>
          <p className="signin-subtitle">
            Access your peer observation dashboard, schedules, and evaluation forms.
          </p>
        </div>

        {error && (
          <div className="signin-error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="signin-form" noValidate>
          <div className="signin-field">
            <label htmlFor="email">University Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="netid@utdallas.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="signin-field">
            <div className="signin-label-row">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="signin-toggle-pw"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="signin-checkbox-container">
            <label className="signin-checkbox-label">
              <input
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
                disabled={loading}
              />
              <span>Keep me signed in on this device</span>
            </label>
          </div>

          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

      </div>
    </div>
  );
}