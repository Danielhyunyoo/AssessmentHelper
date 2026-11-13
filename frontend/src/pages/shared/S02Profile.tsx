// src/pages/shared/S02Profile.tsx
import React, { useEffect, useState, useRef } from "react";
import { facultyApi, observationApi } from "../../api/endpoints";
import type { Course, ScheduledVisit } from "../../api/types";
import { Link } from "react-router-dom";

function formatLabel(value: string) {
  if (!value) return "Not provided";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function S02Profile(): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoRemoving, setPhotoRemoving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [academicRank, setAcademicRank] = useState("");

  const [evaluationCycle, setEvaluationCycle] = useState("");
  const [evaluationStatus, setEvaluationStatus] = useState("");
  const [lastEvaluated, setLastEvaluated] = useState("");

  // Single registered course & observer assignments
  const [registeredCourse, setRegisteredCourse] = useState<Course | null>(null);
  const [isRegisteredObservee, setIsRegisteredObservee] = useState(false);
  const [observerVisits, setObserverVisits] = useState<ScheduledVisit[]>([]);

  const [profilePhoto, setProfilePhoto] = useState<string>("");

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
        const [result, regStatus, myCoursesResp, availData, dashData, scheduledVisits] =
          await Promise.all([
            facultyApi.profile(),
            facultyApi.registrationStatus().catch(() => null),
            facultyApi.courses().catch(() => null),
            facultyApi.availability().catch(() => null),
            facultyApi.dashboard().catch(() => null),
            observationApi.scheduled().catch(() => [] as ScheduledVisit[]),
          ]);

        if (cancelled) return;

        const professor = result.professor as any;
        const first = professor.first_name || "";
        const last = professor.last_name || "";
        
        const profId = professor.user_id ?? professor.id;
        let cachedPhoto = professor.profile_photo;
        if (!cachedPhoto && profId) {
          cachedPhoto = localStorage.getItem(`profile_photo_${profId}`) || localStorage.getItem(`profile_photo_${professor.email}`) || "";
        }
        setProfilePhoto(cachedPhoto || "");

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
        setPhone(professor.phone || "");
        setEditPhone(professor.phone || "");
        setDepartment(professor.department_name || "Not provided");
        setAcademicRank(professor.academic_level || "Not provided");

        setEditFirstName(first);
        setEditLastName(last);

        // Normalize courses array whether returned as [...] or { courses: [...] }
        const rawCourses = myCoursesResp as any;
        const courseList: any[] = Array.isArray(rawCourses)
          ? rawCourses
          : Array.isArray(rawCourses?.courses)
          ? rawCourses.courses
          : [];

        const regObj = regStatus as any;
        const availObj = availData as any;
        const dashObj = dashData as any;

        const registeredFlag = Boolean(
          regObj?.is_registered ||
            regObj?.signup ||
            regObj?.registered ||
            dashObj?.is_registered
        );
        setIsRegisteredObservee(registeredFlag);

        const directCourse =
          regObj?.course ||
          regObj?.registered_course ||
          regObj?.signup?.course ||
          regObj?.signup?.course_section ||
          availObj?.course ||
          availObj?.signup?.course ||
          dashObj?.course ||
          dashObj?.signup?.course ||
          null;

        const candidateIds = [
          regObj?.course_id,
          regObj?.section_id,
          regObj?.selected_course_id,
          regObj?.registered_course_id,
          regObj?.signup?.course_id,
          regObj?.signup?.section_id,
          regObj?.signup?.course_section_id,
          regObj?.signup?.course?.course_id,
          regObj?.signup?.course?.id,
          availObj?.course_id,
          availObj?.section_id,
          availObj?.signup?.course_id,
          dashObj?.course_id,
          dashObj?.signup?.course_id,
        ]
          .filter((val) => val !== null && val !== undefined)
          .map(String);

        if (directCourse && typeof directCourse === "object") {
          setRegisteredCourse(directCourse);
        } else if (candidateIds.length > 0 && courseList.length > 0) {
          const matched = courseList.find((c) => {
            const ids = [c.course_id, c.section_id, c.id]
              .filter((v) => v !== null && v !== undefined)
              .map(String);
            return ids.some((id) => candidateIds.includes(id));
          });
          setRegisteredCourse(matched || null);
        } else if (registeredFlag && courseList.length > 0) {
          const flaggedCourse = courseList.find(
            (c) => c.is_registered || c.registered || c.is_selected || c.selected
          );
          setRegisteredCourse(flaggedCourse || null);
        } else {
          setRegisteredCourse(null);
        }

        const myId = profId;
        const visitList = Array.isArray(scheduledVisits)
          ? scheduledVisits
          : Array.isArray((scheduledVisits as any)?.visits)
          ? (scheduledVisits as any).visits
          : [];

        const asObserver = visitList.filter(
          (v: any) =>
            v.observer_id === myId ||
            v.role === "observer" ||
            (v.observee_id && v.observee_id !== myId)
        );
        setObserverVisits(asObserver);
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

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const input = e.currentTarget;

    if (!file) return;

    setProfileError("");
    setSaveMessage("");

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select a valid image file.");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Profile photos cannot exceed 5 MB.");
      input.value = "";
      return;
    }

    setPhotoSaving(true);

    try {
      const result = await facultyApi.updateProfilePhoto(file);
      const updatedUrl = result.professor.profile_photo || "";

      setProfilePhoto(updatedUrl);

      try {
        const prof = result.professor as any;
        const profId = prof.user_id ?? prof.id;
        if (profId) {
          localStorage.setItem(`profile_photo_${profId}`, updatedUrl);
        }
        if (prof.email) {
          localStorage.setItem(`profile_photo_${prof.email}`, updatedUrl);
        }
      } catch {
        // Ignore storage errors
      }

      window.dispatchEvent(new Event("profile-changed"));
      setSaveMessage("Profile photo updated across your account.");
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : "Unable to upload profile photo."
      );
    } finally {
      setPhotoSaving(false);
      input.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setProfileError("");
    setSaveMessage("");
    setPhotoRemoving(true);

    try {
      // Clear profile photo on the backend so it persists across page refreshes
      await facultyApi.updateProfile({ profile_photo: "" } as any).catch(() => {});

      const sessionResp = await facultyApi.profile().catch(() => null);
      const prof = sessionResp?.professor as any;
      const profId = prof?.user_id ?? prof?.id;

      try {
        if (profId) {
          localStorage.removeItem(`profile_photo_${profId}`);
        }
        if (prof?.email) {
          localStorage.removeItem(`profile_photo_${prof.email}`);
        }
      } catch {
        // Ignore storage errors
      }

      setProfilePhoto("");
      window.dispatchEvent(new Event("profile-changed"));
      setSaveMessage("Profile photo removed. Reverted to initials.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Unable to remove profile photo."
      );
    } finally {
      setPhotoRemoving(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveMessage("");
    setProfileError("");

    try {
      const result = await facultyApi.updateProfile({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: editPhone.trim(),
      });

      const professor = result.professor as any;

      setFirstName(professor.first_name || "");
      setLastName(professor.last_name || "");
      setPhone(professor.phone || "");
      setEditFirstName(professor.first_name || "");
      setEditLastName(professor.last_name || "");
      setEditPhone(professor.phone || "");

      setIsEditingInfo(false);
      window.dispatchEvent(new Event("profile-changed"));
      setSaveMessage("Profile changes saved successfully.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Unable to save profile changes."
      );
    }
  };

  const handleCancelEdit = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditPhone(phone);
    setSaveMessage("");
    setIsEditingInfo(false);
  };

  const formattedCycleStatus = `${evaluationCycle}: ${evaluationStatus.replaceAll("_", " ")}`;

  const formatCourseDetails = (course: any) => {
    const deptCode = course.subject || course.department_code || course.prefix || "";
    const num = course.number || course.course_number || "";
    const code =
      course.course_code ||
      course.code ||
      [deptCode, num].filter(Boolean).join(" ");
    const section = course.section || course.section_number || "";
    const title = course.title || course.course_name || course.name || "";
    const fullCode = code && section ? `${code}.${section}` : code || section;

    return {
      header:
        [fullCode, title].filter(Boolean).join(": ") ||
        "Registered Course Section",
      meta: [
        course.meeting_days || course.days,
        course.meeting_time || course.time || course.schedule,
        course.location || course.room || course.classroom,
      ]
        .filter(Boolean)
        .join(" • "),
    };
  };

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link className="back-dashboard-link" to="/shared/faculty-dashboard">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Upgraded Page Header */}
      <div className="a01-page-header">
        <div>
          <h2 className="profile-page-title">Profile &amp; Evaluation Status</h2>
          <p className="s01-subtitle">
            Manage your faculty contact details, profile photo, and cycle assignments.
          </p>
        </div>

        {evaluationCycle && (
          <span className="a01-cycle-badge">
            Cycle: {evaluationCycle}
          </span>
        )}
      </div>

      {profileLoading && (
        <div className="a07-state-box">Loading your profile...</div>
      )}

      {profileError && (
        <div role="alert" className="empty-state-banner">
          {profileError}
        </div>
      )}

      {saveMessage && (
        <div role="status" className="feedback-banner-success">
          {saveMessage}
        </div>
      )}

      {/* Main Profile Card */}
      <section className="profile-main-card">
        <div className="profile-card-grid">
          <div className="profile-info-col">
            {!isEditingInfo ? (
              <>
                <div className="profile-identity-header">
                  <h3 className="profile-user-name">
                    {firstName} {lastName}
                  </h3>
                  {academicRank && academicRank !== "Not provided" && (
                    <span className="profile-role-badge">
                      {formatLabel(academicRank)}
                    </span>
                  )}
                </div>

                <ul className="profile-details-list">
                  <li className="profile-detail-item">
                    <span className="profile-detail-label">Department</span>
                    <span className="profile-detail-value">{department}</span>
                  </li>

                  <li className="profile-detail-item">
                    <span className="profile-detail-label">Academic Rank</span>
                    <span className="profile-detail-value">
                      {formatLabel(academicRank)}
                    </span>
                  </li>

                  <li className="profile-detail-item">
                    <span className="profile-detail-label">University Email</span>
                    <span className="profile-detail-value">
                      {email || "Not provided"}
                    </span>
                  </li>

                  <li className="profile-detail-item">
                    <span className="profile-detail-label">Phone Number</span>
                    <span
                      className={`profile-detail-value ${
                        !phone ? "muted-placeholder" : ""
                      }`}
                    >
                      {phone || "Not provided"}
                    </span>
                  </li>
                </ul>

                <div className="profile-email-note">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  >
                    <circle cx="12" cy="12" r="10" fill="#2563eb" />
                    <circle cx="12" cy="7.5" r="1.5" fill="#ffffff" />
                    <path
                      d="M10.5 11.5H12V16.5H13.5"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="profile-note-text">
                    <p>
                      To update your university Email ID, please contact
                      Assessment Committee support staff.
                    </p>
                    <p>
                      Your academic rank and department are managed by the
                      Assessment Committee and cannot be changed from this page.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary profile-edit-btn"
                  onClick={() => {
                    setSaveMessage("");
                    setIsEditingInfo(true);
                  }}
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
                    placeholder="(555) 123-4567"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="profile-field-group">
                  <label>Email ID (Locked)</label>
                  <input
                    type="text"
                    value={email}
                    disabled
                    className="disabled-input"
                  />
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
            <div className="profile-avatar-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: profilePhoto ? "transparent" : "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "2.25rem" }}>
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={fullName}
                  className="profile-avatar-img"
                  onError={() => setProfilePhoto("")}
                />
              ) : (
                <span>{getInitials(fullName || "User")}</span>
              )}
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
              className="btn-secondary profile-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoSaving || photoRemoving}
            >
              {photoSaving ? "Uploading..." : "Update Profile Photo"}
            </button>

            {profilePhoto && (
              <button
                type="button"
                className="btn-secondary profile-photo-btn profile-remove-btn"
                onClick={handleRemovePhoto}
                disabled={photoSaving || photoRemoving}
              >
                {photoRemoving ? "Removing..." : "Remove Photo"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Evaluation Status Section */}
      <section className="profile-status-card">
        <div className="profile-section-title-row">
          <span className="a01-phase-pill">Cycle Standing</span>
          <h3>Evaluation Status</h3>
        </div>

        <div className="profile-metrics-grid">
          <div className="profile-metric-box">
            <span className="status-label">Last Completed Observation</span>
            <span className="status-value">{lastEvaluated}</span>
          </div>

          <div className="profile-metric-box">
            <span className="status-label">Current Cycle Status</span>
            <div>
              <span className="status-pill-active">{formattedCycleStatus}</span>
            </div>
          </div>

          <div className="profile-metric-box">
            <span className="status-label">Next Semester Due</span>
            <span className="status-value muted-placeholder">
              Pending cycle assignment
            </span>
          </div>
        </div>
      </section>

      {/* Course & Observation Assignments Section */}
      <section className="profile-status-card">
        <div className="profile-section-title-row">
          <span className="a01-phase-pill">Schedule</span>
          <h3>Course &amp; Observation Assignments</h3>
        </div>

        <div className="profile-assignments-grid">
          {/* Observee Class Registration */}
          <div className="profile-assignment-card">
            <div className="profile-assignment-header">
              <span className="status-label">
                Registered Course (As Observee)
              </span>
              <Link className="notif-action-link" to="/observee/course-selection">
                Manage →
              </Link>
            </div>

            {isRegisteredObservee ? (
              registeredCourse ? (
                <div className="profile-assignment-item">
                  <p className="assignment-primary-text">
                    {formatCourseDetails(registeredCourse).header}
                  </p>
                  {formatCourseDetails(registeredCourse).meta && (
                    <span className="assignment-subtext">
                      {formatCourseDetails(registeredCourse).meta}
                    </span>
                  )}
                </div>
              ) : (
                <p className="assignment-primary-text">
                  Registered for {evaluationCycle}
                </p>
              )
            ) : (
              <p className="status-value muted-placeholder">
                Not currently registered for a course observation.
              </p>
            )}
          </div>

          {/* Observer Assignments */}
          <div className="profile-assignment-card">
            <div className="profile-assignment-header">
              <span className="status-label">
                Observing Assignments (As Observer)
              </span>
              <Link className="notif-action-link" to="/observer/active-observations">
                View All →
              </Link>
            </div>

            {observerVisits.length > 0 ? (
              <div className="profile-observer-list">
                {observerVisits.map((visit: any, idx) => {
                  const courseTitle = [
                    visit.course_code,
                    visit.course_title || visit.course_name,
                  ]
                    .filter(Boolean)
                    .join(": ");

                  return (
                    <div
                      key={visit.pairing_id ?? visit.id ?? idx}
                      className="profile-assignment-item"
                    >
                      <p className="assignment-primary-text">
                        {courseTitle || "Peer Observation"}
                        {visit.observee_name ? ` (${visit.observee_name})` : ""}
                      </p>
                      {visit.confirmed_datetime && (
                        <span className="assignment-subtext">
                          {new Date(visit.confirmed_datetime).toLocaleString(
                            [],
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="status-value muted-placeholder">
                No upcoming peer observations assigned as an observer.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link className="btn-secondary" to="/shared/faculty-dashboard">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}