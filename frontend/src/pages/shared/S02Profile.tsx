// src/pages/shared/S02Profile.tsx
import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import defaultAvatar from "../../assets/avatar.png";

export default function S02Profile(): React.ReactElement {
const fileInputRef = useRef<HTMLInputElement>(null);

const [firstName, setFirstName] = useState<string>("John");
const [lastName, setLastName] = useState<string>("Doe");
const [phone, setPhone] = useState<string>("(972) 883-2111");
const [email] = useState<string>("abc123456@utdallas.edu");
const [department] = useState<string>("Computer Science");
const [academicRank] = useState<string>("Assistant Professor");

const [profilePhoto, setProfilePhoto] = useState<string>(defaultAvatar);

const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
const [editFirstName, setEditFirstName] = useState<string>(firstName);
const [editLastName, setEditLastName] = useState<string>(lastName);
const [editPhone, setEditPhone] = useState<string>(phone);

const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const imageUrl = URL.createObjectURL(file);
    setProfilePhoto(imageUrl);
  }
};

const handleSaveInfo = (e: React.FormEvent) => {
  e.preventDefault();
  setFirstName(editFirstName);
  setLastName(editLastName);
  setPhone(editPhone);
  setIsEditingInfo(false);
};

const handleCancelEdit = () => {
  setEditFirstName(firstName);
  setEditLastName(lastName);
  setEditPhone(phone);
  setIsEditingInfo(false);
};

return (
  <div className="dashboard-container">
    {/* Top-Left Back Link */}
    <div className="back-dashboard-wrapper">
      <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
        ← Back to Dashboard
      </Link>
    </div>

    <h2 className="profile-page-title">Profile and Evaluation Status</h2>

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
          <span className="status-value">Spring 2025</span>
        </div>

        <div className="profile-status-item">
          <span className="status-label">Current Cycle Status</span>
          <span className="status-value highlight-status">Fall 2026 - Due for observation</span>
        </div>

        <div className="profile-status-item">
          <span className="status-label">Next Semester Due</span>
          <span className="status-value">Spring/Fall 2026</span>
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