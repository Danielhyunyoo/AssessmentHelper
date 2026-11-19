// src/pages/shared/S02Profile.tsx
import React, { useEffect, useState, useRef } from "react";
import { facultyApi, observationApi } from "../../api/endpoints";
import type { Course, ScheduledVisit } from "../../api/types";
import { Link } from "react-router-dom";
import { getCarriedForwardRecordForUser } from "../committee/A02FacultyMatching";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const TIME_WINDOWS = [
  {
    value: "Morning (8:00 AM - 12:00 PM)",
    label: "Morning",
    sub: "8:00 AM - 12:00 PM",
  },
  {
    value: "Afternoon (12:00 PM - 4:00 PM)",
    label: "Afternoon",
    sub: "12:00 PM - 4:00 PM",
  },
  {
    value: "Evening (4:00 PM - 8:00 PM)",
    label: "Evening",
    sub: "4:00 PM - 8:00 PM",
  },
];

const AVAILABILITY_STORAGE_KEY = "observer_availability_v1";

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

function formatShortDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUsNational(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function formatInternationalBody(digits: string): string {
  if (digits.startsWith("7")) {
    const cc = "7";
    const rest = digits.slice(1);
    if (!rest) return `+${cc}`;
    if (rest.length <= 3) return `+${cc} (${rest}`;
    if (rest.length <= 6) return `+${cc} (${rest.slice(0, 3)}) ${rest.slice(3)}`;
    if (rest.length <= 8) {
      return `+${cc} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
    }
    return `+${cc} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
  }

  const twoDigitCodes = new Set([
    "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43",
    "44", "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56",
    "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84",
    "86", "90", "91", "92", "93", "94", "95", "98",
  ]);

  const ccLen =
    digits.length >= 2 && twoDigitCodes.has(digits.slice(0, 2))
      ? 2
      : Math.min(3, digits.length);

  const cc = digits.slice(0, ccLen);
  const body = digits.slice(ccLen);
  if (!body) return `+${cc}`;

  if (body.length <= 4) return `+${cc} ${body}`;
  if (body.length <= 8) return `+${cc} ${body.slice(0, 4)} ${body.slice(4)}`;
  return `+${cc} ${body.slice(0, 2)} ${body.slice(2, 6)} ${body.slice(6)}`;
}

function formatPhoneNumber(raw: string): string {
  if (!raw) return "";

  const extMatch = raw.match(/(?:\s*(?:ext\.?|x)\s*)(\d{1,6})$/i);
  const mainPart = extMatch ? raw.slice(0, extMatch.index) : raw;
  const extDigits = extMatch ? extMatch[1] : "";
  const extSuffix = extDigits ? ` x${extDigits}` : "";

  const trimmed = mainPart.trim();
  if (!trimmed) return extSuffix.trim();

  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").slice(0, 15);

  if (!digits) return hasLeadingPlus ? `+${extSuffix}` : extSuffix.trim();

  if (hasLeadingPlus) {
    if (digits.startsWith("1") && digits.length <= 11) {
      const rest = digits.slice(1);
      if (!rest) return `+1${extSuffix}`;
      return `+1 ${formatUsNational(rest)}${extSuffix}`;
    }
    return `${formatInternationalBody(digits)}${extSuffix}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `1 ${formatUsNational(digits.slice(1))}${extSuffix}`;
  }

  if (digits.length > 10) {
    return `${formatInternationalBody(digits)}${extSuffix}`;
  }

  return `${formatUsNational(digits)}${extSuffix}`;
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
  const [isCommitteeUser, setIsCommitteeUser] = useState(false);

  const [evaluationCycle, setEvaluationCycle] = useState("");
  const [evaluationStatus, setEvaluationStatus] = useState("");
  const [lastEvaluated, setLastEvaluated] = useState("");
  const [transferredTargetCycle, setTransferredTargetCycle] = useState<
    string | null
  >(null);

  const [registeredCourse, setRegisteredCourse] = useState<Course | null>(null);
  const [isRegisteredObservee, setIsRegisteredObservee] = useState(false);
  const [observerVisits, setObserverVisits] = useState<ScheduledVisit[]>([]);

  const [profilePhoto, setProfilePhoto] = useState<string>("");

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [availDays, setAvailDays] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return Array.isArray(saved.days) ? saved.days : ["Tue", "Thu"];
    } catch {
      return ["Tue", "Thu"];
    }
  });

  const [availWindows, setAvailWindows] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return Array.isArray(saved.windows)
        ? saved.windows
        : ["Morning (8:00 AM - 12:00 PM)"];
    } catch {
      return ["Morning (8:00 AM - 12:00 PM)"];
    }
  });

  const [specificDates, setSpecificDates] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return Array.isArray(saved.specificDates) ? saved.specificDates : [];
    } catch {
      return [];
    }
  });

  const [newDateInput, setNewDateInput] = useState("");
  const [availNotes, setAvailNotes] = useState<string>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AVAILABILITY_STORAGE_KEY) || "{}"
      );
      return typeof saved.notes === "string" ? saved.notes : "";
    } catch {
      return "";
    }
  });
  const [availSavedStatus, setAvailSavedStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");

      try {
        const [
          result,
          regStatus,
          myCoursesResp,
          availData,
          dashData,
          scheduledVisits,
        ] = await Promise.all([
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
        setIsCommitteeUser(professor.role === "admin");

        const transferRec = getCarriedForwardRecordForUser(
          professor,
          regStatus
        );
        setTransferredTargetCycle(transferRec?.target_cycle ?? null);

        const profId = professor.user_id ?? professor.id;
        const userKey = String(profId ?? professor.email ?? "");
        const phoneMarkerKey = `s02_phone_saved_${userKey}`;

        let cachedPhoto = professor.profile_photo;
        if (!cachedPhoto && profId) {
          cachedPhoto =
            localStorage.getItem(`profile_photo_${profId}`) ||
            localStorage.getItem(`profile_photo_${professor.email}`) ||
            "";
        }
        setProfilePhoto(cachedPhoto || "");

        setEvaluationCycle(result.evaluation_cycle || "Current Cycle");
        setEvaluationStatus(
          transferRec
            ? `transferred to ${transferRec.target_cycle}`
            : String(result.evaluation_status || "undetermined")
        );

        const lastSemester = professor.last_evaluated_semester || "";
        const lastYear = professor.last_evaluated_year;

        setLastEvaluated(
          lastSemester
            ? `${lastSemester}${lastYear ? ` ${lastYear}` : ""}`
            : "No previous evaluation recorded"
        );

        let rawStoredPhone = professor.phone || "";
        try {
          const hasLocalPhoneMarker = Boolean(
            userKey && localStorage.getItem(phoneMarkerKey)
          );
          if (rawStoredPhone && !hasLocalPhoneMarker) {
            rawStoredPhone = "";
            void facultyApi
              .updateProfile({
                first_name: first,
                last_name: last,
                phone: "",
              })
              .catch(() => {});
          }
        } catch {
          // Ignore storage errors
        }

        const formattedStoredPhone = formatPhoneNumber(rawStoredPhone);

        setFirstName(first);
        setLastName(last);
        setEmail(professor.email || "");
        setPhone(formattedStoredPhone);
        setEditPhone(formattedStoredPhone);
        setDepartment(professor.department_name || "Not provided");
        setAcademicRank(professor.academic_level || "Not provided");

        setEditFirstName(first);
        setEditLastName(last);

        const rawCourses = myCoursesResp as any;
        const courseList: any[] = Array.isArray(rawCourses)
          ? rawCourses
          : Array.isArray(rawCourses?.courses)
          ? rawCourses.courses
          : [];

        const regObj = regStatus as any;
        const availObj = availData as any;
        const dashObj = dashData as any;

        const registeredFlag =
          !transferRec &&
          Boolean(
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
            (c) =>
              c.is_registered || c.registered || c.is_selected || c.selected
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

    const handleDemoReset = () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("s02_phone_saved_"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignore storage errors
      }
      setPhone("");
      setEditPhone("");
      setProfilePhoto("");
      setTransferredTargetCycle(null);
      setAvailDays(["Tue", "Thu"]);
      setAvailWindows(["Morning (8:00 AM - 12:00 PM)"]);
      setSpecificDates([]);
      setAvailNotes("");
      setAvailSavedStatus("");
      setIsEditingInfo(false);
      setSaveMessage("");
    };

    void loadProfile();
    window.addEventListener("demo-reset", handleDemoReset);

    return () => {
      cancelled = true;
      window.removeEventListener("demo-reset", handleDemoReset);
    };
  }, []);

  const toggleAvailDay = (day: string) => {
    setAvailSavedStatus("");
    setAvailDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleAvailWindow = (win: string) => {
    setAvailSavedStatus("");
    setAvailWindows((prev) =>
      prev.includes(win) ? prev.filter((w) => w !== win) : [...prev, win]
    );
  };

  const handleAddSpecificDate = () => {
    if (!newDateInput) return;
    setAvailSavedStatus("");
    setSpecificDates((prev) =>
      prev.includes(newDateInput) ? prev : [...prev, newDateInput].sort()
    );
    setNewDateInput("");
  };

  const handleRemoveSpecificDate = (dateToRemove: string) => {
    setAvailSavedStatus("");
    setSpecificDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const handleSaveAvailability = () => {
    try {
      localStorage.setItem(
        AVAILABILITY_STORAGE_KEY,
        JSON.stringify({
          days: availDays,
          windows: availWindows,
          specificDates,
          notes: availNotes.trim(),
          updatedAt: new Date().toISOString(),
        })
      );
      window.dispatchEvent(new Event("observer-availability-changed"));
      setAvailSavedStatus("Availability saved.");
    } catch {
      setProfileError("Unable to save observer availability.");
    }
  };

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
      await facultyApi
        .updateProfile({ profile_photo: "" } as any)
        .catch(() => {});

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

    const formattedPhoneToSave = formatPhoneNumber(editPhone);

    try {
      const result = await facultyApi.updateProfile({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: formattedPhoneToSave,
      });

      const professor = result.professor as any;
      const savedPhone = formatPhoneNumber(
        professor.phone ?? formattedPhoneToSave
      );

      try {
        const userKey = String(
          professor.user_id ?? professor.id ?? professor.email ?? ""
        );
        if (userKey) {
          if (savedPhone) {
            localStorage.setItem(`s02_phone_saved_${userKey}`, "1");
          } else {
            localStorage.removeItem(`s02_phone_saved_${userKey}`);
          }
        }
      } catch {
        // Ignore storage errors
      }

      setFirstName(professor.first_name || "");
      setLastName(professor.last_name || "");
      setPhone(savedPhone);
      setEditFirstName(professor.first_name || "");
      setEditLastName(professor.last_name || "");
      setEditPhone(savedPhone);

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
    const deptCode =
      course.subject || course.department_code || course.prefix || "";
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
        .join(" - "),
    };
  };

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const hasFullPortalAccess =
    isCommitteeUser || (isRegisteredObservee && !transferredTargetCycle);
  const backDestination = isCommitteeUser
    ? "/committee/dashboard"
    : hasFullPortalAccess
    ? "/shared/faculty-dashboard"
    : "/login/signin2";
  const backTopLabel = hasFullPortalAccess
    ? "← Back to Dashboard"
    : transferredTargetCycle
    ? "← Back to Cycle Status"
    : "← Back to Cycle Registration";
  const backBottomLabel = hasFullPortalAccess
    ? "Return to Dashboard"
    : transferredTargetCycle
    ? "Return to Cycle Status"
    : "Return to Cycle Registration";

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link className="back-dashboard-link" to={backDestination}>
          {backTopLabel}
        </Link>
      </div>

      {/* Header matching A03-A08 */}
      <div className="committee-page-header">
        <h2>Profile and Evaluation Status</h2>
        {evaluationCycle && (
          <div className="committee-page-header-meta">
            <span className="a01-cycle-badge">Cycle: {evaluationCycle}</span>
          </div>
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
      <section className="profile-main-card s05-section-accent-primary">
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
                    className="profile-note-icon"
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
                    placeholder="(555) 123-4567 or +44 20 7946 0958"
                    value={editPhone}
                    onChange={(e) =>
                      setEditPhone(formatPhoneNumber(e.target.value))
                    }
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
            <div
              className={`profile-avatar-container ${
                profilePhoto ? "has-photo" : "is-initials"
              }`}
            >
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
              className="profile-hidden-file-input"
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

      {/* Observer Availability Preferences Section */}
      <section className="profile-status-card s05-section-accent-sage">
        <div className="s02-avail-header">
          <div className="profile-section-title-row">
            <span className="a01-phase-pill">Observer Role</span>
            <h3>Observer Availability Preferences</h3>
          </div>
          <span className="s01-subtitle s04-zero-margin">
            Used when scheduling peer classroom visits
          </span>
        </div>

        <div className="s02-avail-grid">
          <div className="s02-avail-col">
            <div className="l03-field-block">
              <span className="l03-field-label">Preferred Days of Week</span>
              <div className="l03-chip-group">
                {DAYS_OF_WEEK.map((day) => {
                  const active = availDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`l03-chip-btn ${active ? "is-selected" : ""}`}
                      onClick={() => toggleAvailDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="l03-field-block">
              <span className="l03-field-label">Preferred Time Windows</span>
              <div className="l03-window-grid">
                {TIME_WINDOWS.map((win) => {
                  const active = availWindows.includes(win.value);
                  return (
                    <button
                      key={win.value}
                      type="button"
                      className={`l03-window-btn ${
                        active ? "is-selected" : ""
                      }`}
                      onClick={() => toggleAvailWindow(win.value)}
                    >
                      <span className="l03-window-title">{win.label}</span>
                      <span className="l03-window-sub">{win.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="s02-avail-col">
            <div className="l03-field-block">
              <label htmlFor="s02-specific-date" className="l03-field-label">
                Specific Available Dates (Optional)
              </label>
              <div className="s02-date-picker-row">
                <input
                  id="s02-specific-date"
                  type="date"
                  className="s02-date-input"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddSpecificDate}
                  disabled={!newDateInput}
                >
                  Add Date
                </button>
              </div>

              {specificDates.length > 0 ? (
                <div className="s02-date-tags">
                  {specificDates.map((d) => (
                    <span key={d} className="s02-date-tag">
                      {formatShortDate(d)}
                      <button
                        type="button"
                        aria-label={`Remove ${d}`}
                        className="s02-date-tag-remove"
                        onClick={() => handleRemoveSpecificDate(d)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="l03-avail-hint">
                  No specific calendar dates pinned yet.
                </span>
              )}
            </div>

            <div className="l03-field-block">
              <label htmlFor="s02-avail-notes" className="l03-field-label">
                Scheduling Notes
              </label>
              <input
                id="s02-avail-notes"
                type="text"
                className="l03-notes-input"
                placeholder="e.g., Prefer morning sections or South Campus buildings"
                value={availNotes}
                onChange={(e) => {
                  setAvailSavedStatus("");
                  setAvailNotes(e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        <div className="s02-avail-footer">
          <span className="s02-avail-status">{availSavedStatus}</span>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveAvailability}
          >
            Save Availability
          </button>
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
            <span
              className={`status-value ${
                transferredTargetCycle ? "" : "muted-placeholder"
              }`}
            >
              {transferredTargetCycle || "Pending cycle assignment"}
            </span>
          </div>
        </div>
      </section>

      {/* Course and Observation Assignments Section */}
      <section className="profile-status-card">
        <div className="profile-section-title-row">
          <span className="a01-phase-pill">Schedule</span>
          <h3>Course and Observation Assignments</h3>
        </div>

        <div className="profile-assignments-grid">
          <div className="profile-assignment-card">
            <div className="profile-assignment-header">
              <span className="status-label">
                Registered Course (As Observee)
              </span>
              {hasFullPortalAccess && (
                <Link
                  className="notif-action-link"
                  to="/observee/course-selection"
                >
                  Manage →
                </Link>
              )}
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
                {transferredTargetCycle
                  ? `Carried forward to ${transferredTargetCycle}.`
                  : "Not currently registered for a course observation."}
              </p>
            )}
          </div>

          <div className="profile-assignment-card">
            <div className="profile-assignment-header">
              <span className="status-label">
                Observing Assignments (As Observer)
              </span>
              <Link
                className="notif-action-link"
                to="/shared/current-past-observations"
              >
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

      <div className="dashboard-center-action">
        <Link className="btn-secondary" to={backDestination}>
          {backBottomLabel}
        </Link>
      </div>
    </div>
  );
}