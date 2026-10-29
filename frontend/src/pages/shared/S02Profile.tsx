// src/pages/shared/S02Profile.tsx
import React, { useEffect, useState, useRef } from "react";
import { facultyApi } from "../../api/endpoints";
import type { ProfileResponse } from "../../api/types";
import { Link } from "react-router-dom";
import defaultAvatar from "../../assets/avatar.png";

export default function S02Profile(): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [academicRank, setAcademicRank] = useState("");

  const [evaluationCycle, setEvaluationCycle] = useState("");
  const [evaluationStatus, setEvaluationStatus] = useState("");
  const [lastEvaluated, setLastEvaluated] = useState("");

  const [profilePhoto, setProfilePhoto] = useState<string>(defaultAvatar);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");

      try {
        const result = await facultyApi.profile();
        if (cancelled) return;

        const professor = result.professor;
        const first = professor.first_name || "";
        const last = professor.last_name || "";
        
        setEvaluationCycle(result.evaluation_cycle || "Current Cycle");
        setEvaluationStatus(
          String(result.evaluation_status || "undetermined")
        );

        const lastSemester = professor.last_evaluated_semester || "";
        const lastYear = professor.last_evaluated_year;

        setLastEvaluated(
          lastSemester
            ? `${lastSemester}${lastYear ? ` ${lastYear}` : ""}`
            : "No previous evaluation recorded"
        );

        setFirstName(first);
        setLastName(last);
        setEmail(professor.email || "");
        setDepartment(professor.department_name || "Not provided");
        setAcademicRank(professor.academic_level || "Not provided");

        setEditFirstName(first);
        setEditLastName(last);
      } catch (err) {
        if (!cancelled) {
          setProfileError(
            err instanceof Error ? err.message : "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePhoto(imageUrl);
    }
  };

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();

    setSaveMessage(
      "Profile editing is not connected to a save endpoint yet. Your changes have not been saved."
    );
  };

  const handleCancelEdit = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditPhone(phone);
    setSaveMessage("");
    setIsEditingInfo(false);
  };

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          Back to Dashboard
        </Link>
      </div>

      <h2 className="profile-page-title">Profile and Evaluation Status</h2>

      {profileLoading && <p>Loading your profile...</p>}

      {profileError && (
        <div role="alert" className="yellow-banner">
          {profileError}
        </div>
      )}

      {saveMessage && (
        <div role="status" className="yellow-banner">
          {saveMessage}
        </div>
      )}

      {/* Main Profile Section */}
      <section className="dashboard-phase profile-main-card">
        <div className="profile-card-grid">
          <div className="profile-info-col">
            {!isEditingInfo ? (
              <>
                <h3 className="profile-user-name">
                  {firstName} {lastName}
                </h3>
                <div className="profile-details-list">
                  <p><strong>Department:</strong> {department}</p>
                  <p><strong>Academic Rank:</strong> {academicRank}</p>
                  <p><strong>Email ID:</strong> {email}</p>
                  <p><strong>Phone Number:</strong> {phone}</p>
                </div>

                <div className="profile-email-note">
                  ℹ️ <em>To update your university Email ID, please contact Assessment Committee support staff.</em>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsEditingInfo(true)}
                >
                  Update Contact Information
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveInfo} className="profile-edit-form">
                <h3>Edit Contact Information</h3>

                <div className="profile-field-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="profile-field-group">
                  <label>Email ID (Locked)</label>
                  <input type="text" value={email} disabled className="disabled-input" />
                </div>

                <div className="profile-form-actions">
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="profile-photo-col">
            <div className="profile-avatar-container">
              <img
                src={profilePhoto}
                alt={`${firstName} ${lastName}`}
                className="profile-avatar-img"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem", width: "100%" }}
              onClick={() => fileInputRef.current?.click()}
            >
              Update Profile Photo
            </button>
          </div>
        </div>
      </section>

      {/* Evaluation Status Card */}
      <section className="table-container theme-green profile-status-card">
        <h3>Evaluation Status</h3>

        <div className="profile-status-grid">
          <div className="profile-status-item">
            <span className="status-label">Last Completed Observation</span>
            <span className="status-value">{lastEvaluated}</span>
          </div>

          <div className="profile-status-item">
            <span className="status-label">Current Cycle Status</span>
            <span className="status-value highlight-status">{`${evaluationCycle}: ${evaluationStatus.replaceAll("_", " ")}`}</span>
          </div>

          <div className="profile-status-item">
            <span className="status-label">Next Semester Due</span>
            <span className="status-value">Not provided by the backend yet</span>
          </div>
        </div>
      </section>

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}