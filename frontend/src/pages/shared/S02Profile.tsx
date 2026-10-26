// src/pages/shared/S02Profile.tsx
import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import defaultAvatar from "../../assets/avatar.png";

export default function S02Profile(): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Profile State (Backend connection placeholders)
  const [firstName, setFirstName] = useState<string>("John");
  const [lastName, setLastName] = useState<string>("Doe");
  const [phone, setPhone] = useState<string>("(972) 883-2111");
  const [email] = useState<string>("abc123456@utdallas.edu");
  const [department] = useState<string>("Computer Science");
  const [academicRank] = useState<string>("Assistant Professor");

  // Default avatar image set to avatar.png
  const [profilePhoto, setProfilePhoto] = useState<string>(defaultAvatar);

  // Edit Mode States
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [editFirstName, setEditFirstName] = useState<string>(firstName);
  const [editLastName, setEditLastName] = useState<string>(lastName);
  const [editPhone, setEditPhone] = useState<string>(phone);

  // Handle Profile Picture File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePhoto(imageUrl);
      console.log("New profile picture uploaded:", file.name);
    }
  };

  // Save Contact Information
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setFirstName(editFirstName);
    setLastName(editLastName);
    setPhone(editPhone);
    setIsEditingInfo(false);

    const payload = {
      firstName: editFirstName,
      lastName: editLastName,
      phone: editPhone,
    };
    console.log("Saving updated profile to SQL backend:", payload);
  };

  const handleCancelEdit = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditPhone(phone);
    setIsEditingInfo(false);
  };

  return (
    <div className="dashboard-container">
      {/* Back to Dashboard Link */}
      <div className="profile-back-link-wrapper">
        <Link to="/shared/faculty-dashboard" className="profile-back-link">
          &larr; Back to Dashboard
        </Link>
      </div>

      <h2 className="profile-page-title">Profile and Evaluation Status</h2>

      {/* Main Profile Card Section */}
      <section className="dashboard-phase profile-main-card">
        <div className="profile-card-grid">
          {/* Left Column: User Info & Editable Form */}
          <div className="profile-info-col">
            {!isEditingInfo ? (
              <>
                <h3 className="profile-user-name">
                  {firstName} {lastName}
                </h3>
                <div className="profile-details-list">
                  <p>
                    <strong>Department:</strong> {department}
                  </p>
                  <p>
                    <strong>Academic Rank:</strong> {academicRank}
                  </p>
                  <p>
                    <strong>Email ID:</strong> {email}
                  </p>
                  <p>
                    <strong>Phone Number:</strong> {phone}
                  </p>
                </div>

                <div className="profile-email-note">
                  ℹ️ <em>To update your university Email ID, please contact Assessment Committee support staff.</em>
                </div>

                <button
                  type="button"
                  className="primary-btn profile-action-btn"
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
                  <button type="submit" className="primary-btn">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Profile Picture & Image Upload */}
          <div className="profile-photo-col">
            <div className="profile-avatar-container">
              <img
                src={profilePhoto}
                alt={`${firstName} ${lastName}`}
                className="profile-avatar-img"
              />
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="secondary-btn profile-photo-btn"
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

      {/* Return to Dashboard Footer Link */}
      <div className="profile-bottom-nav">
        <Link to="/shared/faculty-dashboard" className="secondary-btn">
          Return to Faculty Dashboard
        </Link>
      </div>
    </div>
  );
}