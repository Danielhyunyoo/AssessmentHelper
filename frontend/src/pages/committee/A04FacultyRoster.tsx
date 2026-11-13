// src/pages/committee/A04FacultyRoster.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { FacultyRow, FacultyRoster } from "../../api/types";

function normalizeRankValue(rank: string | null | undefined): string {
  if (!rank) return "";
  const normalized = rank.trim().toLowerCase();
  if (normalized === "assistant" || normalized === "assistant professor") {
    return "assistant";
  }
  if (normalized === "associate" || normalized === "associate professor") {
    return "associate";
  }
  if (normalized === "full" || normalized === "full professor") {
    return "full";
  }
  if (
    normalized === "professor_of_instruction" ||
    normalized === "professor of instruction"
  ) {
    return "professor_of_instruction";
  }
  return rank;
}

function formatAcademicRank(rank: string | null | undefined): string {
  const rankLabels: Record<string, string> = {
    assistant: "Assistant Professor",
    associate: "Associate Professor",
    full: "Full Professor",
    professor_of_instruction: "Professor of Instruction",
  };

  if (!rank) return "Not specified";
  const key = normalizeRankValue(rank);
  return rankLabels[key] || rank;
}

const PROGRESS_LABELS: Record<string, string> = {
  not_registered: "Not registered",
  registered_no_course: "Registered, no course",
  course_selected: "Course selected",
};

function getMemberAvatar(member: FacultyRow): string | null {
  try {
    const byId = localStorage.getItem(`profile_photo_${member.user_id}`);
    if (byId) return byId;
    if (member.email) {
      const byEmail = localStorage.getItem(`profile_photo_${member.email}`);
      if (byEmail) return byEmail;
    }
  } catch {
    // Ignore storage errors
  }

  const rec = member as unknown as Record<string, unknown>;
  for (const key of ["profile_photo", "avatar_url", "photo_url", "profile_picture", "avatar"]) {
    if (typeof rec[key] === "string" && (rec[key] as string).trim()) {
      return rec[key] as string;
    }
  }
  return null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function A04FacultyRoster() {
  const [roster, setRoster] = useState<FacultyRoster | null>(null);
  const [unregistered, setUnregistered] = useState<FacultyRow[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sort, setSort] = useState<"name" | "department" | "rank" | "status">(
    "name"
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedMember, setSelectedMember] = useState<FacultyRow | null>(null);
  const [pendingRankChange, setPendingRankChange] = useState<{
    member: FacultyRow;
    newRank: string;
  } | null>(null);
  const [isUpdatingRank, setIsUpdatingRank] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFaculty() {
    try {
      const [rosterResult, unregisteredResult] = await Promise.all([
        committeeApi.faculty({ search, sort }),
        committeeApi.unregistered({ search, sort }),
      ]);

      setRoster(rosterResult);
      setUnregistered(unregisteredResult.faculty);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load faculty."
      );
    }
  }

  useEffect(() => {
    void loadFaculty();

    const handleProfileChange = () => {
      void loadFaculty();
    };
    window.addEventListener("profile-changed", handleProfileChange);
    return () => {
      window.removeEventListener("profile-changed", handleProfileChange);
    };
  }, [search, sort]);

  function openMemberProfile(member: FacultyRow) {
    setAvatarFailed(false);
    setPendingRankChange(null);
    setSelectedMember(member);
  }

  function requestRankChange(member: FacultyRow, newRank: string) {
    const currentNormalized = normalizeRankValue(member.academic_rank);
    if (newRank === currentNormalized) return;
    setPendingRankChange({ member, newRank });
  }

  async function confirmRankChange() {
    if (!pendingRankChange) return;
    const { member, newRank } = pendingRankChange;

    setIsUpdatingRank(true);
    setError("");
    setMessage("");
    try {
      await committeeApi.updateRank(member.user_id, newRank);
      setSelectedMember((prev) =>
        prev && prev.user_id === member.user_id
          ? { ...prev, academic_rank: newRank }
          : prev
      );
      setPendingRankChange(null);
      await loadFaculty();
      setMessage(
        `Academic rank for ${member.name} updated to ${formatAcademicRank(
          newRank
        )}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update rank.");
    } finally {
      setIsUpdatingRank(false);
    }
  }

  async function handleReminders() {
    if (selected.length === 0) {
      setError("Select at least one unregistered faculty member.");
      return;
    }

    setError("");
    setMessage("");
    try {
      await committeeApi.remindRegistration(selected);
      setMessage(
        `Registration reminder${selected.length === 1 ? "" : "s"} sent to ${
          selected.length
        } faculty member${selected.length === 1 ? "" : "s"}.`
      );
      setSelected([]);
      await loadFaculty();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send reminders."
      );
    }
  }

  const allFaculty = roster?.faculty ?? [];

  const departments = [
    ...new Set(allFaculty.map((f) => f.department).filter(Boolean)),
  ].sort() as string[];

  const filteredFaculty = allFaculty.filter((member) => {
    if (departmentFilter && member.department !== departmentFilter) {
      return false;
    }
    return true;
  });

  const filteredUnregistered = unregistered.filter((prof) => {
    if (departmentFilter && prof.department !== departmentFilter) {
      return false;
    }
    return true;
  });

  const dueOrOverdueCount = filteredFaculty.filter(
    (m) => m.evaluation_status === "overdue" || m.evaluation_status === "due"
  ).length;

  const renderEmailCell = (email: string | null | undefined, name: string) => {
    if (!email) {
      return <span className="font-slate font-sm">No email</span>;
    }

    return (
      <a
        href={`mailto:${email}`}
        title={`Email ${name} (${email})`}
        className="a04-email-pill-btn"
      >
        <span aria-hidden="true">✉</span>
        <span>Email</span>
      </a>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="a02-section-header-bar">
        <h2 className="a02-section-heading">
          Faculty Registration and Communications
        </h2>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div role="alert" className="yellow-banner">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="feedback-banner-success">
          {message}
        </div>
      )}

      {/* SECTION 1: FACULTY ROSTER */}
      <section className="dashboard-phase">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">
              This Cycle&apos;s Faculty Roster
            </h3>
            <span className="status-chip chip-draft">
              {filteredFaculty.length} FACULTY
            </span>
          </div>
        </div>

        <ul className="instruction-bullet-list">
          <li>
            <em>
              Click any faculty member&apos;s name to inspect their full profile,
              edit their academic rank, and view quick navigation links.
            </em>
          </li>
        </ul>

        {/* Search, Department & Sort Controls Bar */}
        <div className="roster-controls-row a04-controls-bar">
          <div className="search-control-group">
            <label htmlFor="a04-search">Search Faculty:</label>
            <div className="search-input-wrapper">
              <input
                id="a04-search"
                type="text"
                placeholder="Search by name, department, or email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="styled-text-input"
              />
            </div>
          </div>

          {departments.length > 0 && (
            <div className="sort-control-group">
              <label htmlFor="a04-dept-filter">Department:</label>
              <select
                id="a04-dept-filter"
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="styled-select-input"
              >
                <option value="">All departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sort-control-group">
            <label htmlFor="a04-sort">Sort By:</label>
            <select
              id="a04-sort"
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value as
                    | "name"
                    | "department"
                    | "rank"
                    | "status"
                )
              }
              className="styled-select-input"
            >
              <option value="name">Name</option>
              <option value="department">Department</option>
              <option value="rank">Academic Rank</option>
              <option value="status">Registration Status</option>
            </select>
          </div>
        </div>

        {/* Green Theme Scrollable Table Box */}
        <div className="table-container theme-green">
          <div className="table-instruction">
            Select a faculty member&apos;s name to view their full profile.
          </div>

          <div className="table-scroll-wrapper a04-scroll-box">
            <table className="custom-data-table a04-sticky-table">
              <thead>
                <tr>
                  <th>Observee Name</th>
                  <th>Department</th>
                  <th>Course and Section</th>
                  <th>Academic Level</th>
                  <th>Enrollment Status</th>
                  <th className="align-center">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((member) => (
                  <tr key={member.user_id}>
                    <td>
                      <button
                        type="button"
                        className="a04-name-link-btn"
                        onClick={() => openMemberProfile(member)}
                      >
                        {member.name}
                      </button>
                    </td>

                    <td>{member.department || "Not provided"}</td>

                    <td>
                      {member.course
                        ? `${member.course.department_code} ${member.course.course_number}.${member.course.section}`
                        : "No course selected"}
                    </td>

                    <td>{formatAcademicRank(member.academic_rank)}</td>

                    <td>
                      <span
                        className={`status-chip a02-chip-xs a04-nowrap-chip ${
                          member.progress_status === "course_selected"
                            ? "chip-draft"
                            : member.progress_status === "registered_no_course"
                            ? "a02-chip-warning"
                            : "chip-locked"
                        }`}
                      >
                        {PROGRESS_LABELS[member.progress_status] ??
                          "Not available"}
                      </span>
                    </td>

                    <td className="align-center">
                      {renderEmailCell(member.email, member.name)}
                    </td>
                  </tr>
                ))}

                {filteredFaculty.length === 0 && (
                  <tr>
                    <td colSpan={6} className="a03-empty-cell">
                      No faculty members match your current search or department
                      filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: UNREGISTERED OBSERVEES */}
      <section className="dashboard-phase phase-spacing">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">
              Unregistered Observees (Pending Reminders)
            </h3>
            <span
              className={`status-chip a04-nowrap-chip ${
                filteredUnregistered.length > 0
                  ? "a02-chip-warning"
                  : "chip-draft"
              }`}
            >
              {filteredUnregistered.length} PENDING
            </span>
          </div>
        </div>

        <ul className="instruction-bullet-list">
          <li>
            <em>
              Faculty members below are due for evaluation in this cycle but
              have not yet registered a course section.
            </em>
          </li>
          <li>
            <em>
              Selected faculty members will receive a reminder to register for
              the current evaluation cycle.
            </em>
          </li>
        </ul>

        {/* Orange Theme Scrollable Table Box */}
        <div className="table-container theme-orange">
          <div className="table-instruction">
            Select faculty members to send a registration reminder, or click a
            name to view their profile.
          </div>

          <div className="table-scroll-wrapper a04-scroll-box">
            <table className="custom-data-table a04-sticky-table">
              <thead>
                <tr>
                  <th className="col-checkbox">Select</th>
                  <th>Professor Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th className="align-center">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnregistered.map((prof) => {
                  const isChecked = selected.includes(prof.user_id);
                  return (
                    <tr
                      key={prof.user_id}
                      className={isChecked ? "a03-row-selected" : ""}
                    >
                      <td className="align-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${prof.name}`}
                          checked={isChecked}
                          onChange={(event) =>
                            setSelected((previous) =>
                              event.target.checked
                                ? [...previous, prof.user_id]
                                : previous.filter((id) => id !== prof.user_id)
                            )
                          }
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="a04-name-link-btn"
                          onClick={() => openMemberProfile(prof)}
                        >
                          {prof.name}
                        </button>
                      </td>
                      <td>{prof.department ?? "Not provided"}</td>
                      <td>{formatAcademicRank(prof.academic_rank)}</td>
                      <td className="align-center">
                        {renderEmailCell(prof.email, prof.name)}
                      </td>
                    </tr>
                  );
                })}

                {filteredUnregistered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="a03-empty-cell">
                      No unregistered faculty members match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="unregistered-actions-bar compact-actions-bar">
          <div className="bulk-btn-group">
            <button
              type="button"
              className="btn-select-toggle"
              onClick={() =>
                setSelected(
                  filteredUnregistered.map((person) => person.user_id)
                )
              }
              disabled={filteredUnregistered.length === 0}
            >
              Select All ({filteredUnregistered.length})
            </button>
            <button
              type="button"
              className="btn-select-toggle"
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleReminders()}
            disabled={selected.length === 0}
          >
            Send Registration Reminders
            {selected.length > 0 ? ` (${selected.length})` : ""}
          </button>
        </div>
      </section>

      {/* SECTION 3: EVALUATION DUE & OVERDUE STATUS */}
      <section className="dashboard-phase phase-spacing">
        <div className="a02-section-header-bar">
          <div className="a02-section-title-group">
            <h3 className="a02-section-heading">
              Evaluation Due &amp; Overdue Status
            </h3>
            <span className="status-chip chip-draft a04-nowrap-chip">
              {dueOrOverdueCount} DUE / OVERDUE
            </span>
          </div>
        </div>

        <ul className="instruction-bullet-list">
          <li>
            <em>
              Track faculty evaluation status across current and past evaluation
              cycles.
            </em>
          </li>
        </ul>

        {/* Green Theme Scrollable Table Box */}
        <div className="table-container theme-green">
          <div className="table-instruction">
            Review faculty members flagged as Due or Overdue for an evaluation.
          </div>

          <div className="table-scroll-wrapper a04-scroll-box">
            <table className="custom-data-table a04-sticky-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Evaluation Status</th>
                  <th>Last Evaluated</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((member) => {
                  const evaluationStatus = member.evaluation_status;
                  return (
                    <tr key={member.user_id}>
                      <td>
                        <button
                          type="button"
                          className="a04-name-link-btn"
                          onClick={() => openMemberProfile(member)}
                        >
                          {member.name}
                        </button>
                      </td>
                      <td>{member.department || "Not provided"}</td>
                      <td>{formatAcademicRank(member.academic_rank)}</td>
                      <td>
                        {evaluationStatus === "overdue" ? (
                          <span className="status-chip chip-locked a02-chip-xs a04-nowrap-chip">
                            Overdue
                          </span>
                        ) : evaluationStatus === "due" ? (
                          <span className="status-chip a02-chip-warning a02-chip-xs a04-nowrap-chip">
                            Due for Evaluation
                          </span>
                        ) : evaluationStatus === "not_due" ? (
                          <span className="status-chip chip-draft a02-chip-xs a04-nowrap-chip">
                            Not Due
                          </span>
                        ) : (
                          <span className="font-slate font-sm">
                            Undetermined
                          </span>
                        )}
                      </td>
                      <td>
                        {member.last_evaluated_semester
                          ? `${member.last_evaluated_semester} ${
                              member.last_evaluated_year ?? ""
                            }`.trim()
                          : "No previous evaluation"}
                      </td>
                    </tr>
                  );
                })}

                {filteredFaculty.length === 0 && (
                  <tr>
                    <td colSpan={5} className="a03-empty-cell">
                      No evaluation status records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>

      {/* Faculty Profile Quick-View Modal */}
      {selectedMember && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="modal-card a04-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Identity Header with Profile Picture */}
            <div className="a04-modal-header">
              <div className="a04-modal-identity">
                <div className="a04-modal-avatar">
                  {getMemberAvatar(selectedMember) && !avatarFailed ? (
                    <img
                      src={getMemberAvatar(selectedMember)!}
                      alt={selectedMember.name}
                      className="a04-modal-avatar-img"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span className="a04-modal-avatar-initials">
                      {getInitials(selectedMember.name)}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="a04-modal-name">{selectedMember.name}</h3>
                  <p className="a04-modal-subtitle">
                    {formatAcademicRank(selectedMember.academic_rank)} ·{" "}
                    {selectedMember.department || "Department not specified"}
                  </p>
                </div>
              </div>

              <span
                className={`status-chip a02-chip-xs a04-nowrap-chip ${
                  selectedMember.progress_status === "course_selected"
                    ? "chip-draft"
                    : "a02-chip-warning"
                }`}
              >
                {PROGRESS_LABELS[selectedMember.progress_status] ??
                  "Status Unknown"}
              </span>
            </div>

            {/* Info Grid */}
            <div className="a04-profile-grid">
              <div className="a04-profile-item">
                <span className="a02-card-section-label">Email Address</span>
                <span className="a04-profile-value">
                  {selectedMember.email ? (
                    <a
                      href={`mailto:${selectedMember.email}`}
                      className="a04-email-link"
                    >
                      {selectedMember.email}
                    </a>
                  ) : (
                    "No email on file"
                  )}
                </span>
              </div>

              <div className="a04-profile-item">
                <label
                  htmlFor="a04-modal-rank-select"
                  className="a02-card-section-label"
                >
                  Academic Level
                </label>
                <select
                  id="a04-modal-rank-select"
                  className="styled-select-input a04-modal-select"
                  value={normalizeRankValue(selectedMember.academic_rank)}
                  onChange={(event) =>
                    requestRankChange(selectedMember, event.target.value)
                  }
                >
                  <option value="">Not specified</option>
                  <option value="assistant">Assistant Professor</option>
                  <option value="associate">Associate Professor</option>
                  <option value="full">Full Professor</option>
                  <option value="professor_of_instruction">
                    Professor of Instruction
                  </option>
                </select>
              </div>

              <div className="a04-profile-item">
                <span className="a02-card-section-label">
                  Evaluation Status
                </span>
                <span className="a04-profile-value a03-capitalize">
                  {selectedMember.evaluation_status
                    ? selectedMember.evaluation_status.replace("_", " ")
                    : "Undetermined"}
                </span>
              </div>

              <div className="a04-profile-item">
                <span className="a02-card-section-label">
                  Registered Course
                </span>
                <span className="a04-profile-value">
                  {selectedMember.course
                    ? `${selectedMember.course.department_code} ${selectedMember.course.course_number}.${selectedMember.course.section}: ${selectedMember.course.title}`
                    : "No course selected for this cycle"}
                </span>
              </div>

              <div className="a04-profile-item a04-profile-item-full">
                <span className="a02-card-section-label">
                  Course Schedule / History
                </span>
                <span className="a04-profile-value">
                  {selectedMember.course?.schedule
                    ? selectedMember.course.schedule
                    : selectedMember.last_evaluated_semester
                    ? `Last evaluated: ${selectedMember.last_evaluated_semester} ${
                        selectedMember.last_evaluated_year ?? ""
                      }`
                    : "No schedule or prior evaluation on record"}
                </span>
              </div>
            </div>

            {/* Actions & Navigation */}
            <div className="a04-modal-redirects">
              <span className="a02-card-section-label">Actions</span>
              <div className="a04-redirect-buttons">
                {selectedMember.email && (
                  <a
                    href={`mailto:${selectedMember.email}`}
                    className="btn-secondary a04-action-btn"
                  >
                    Email Faculty Member
                  </a>
                )}

                {selectedMember.course && (
                  <Link
                    to="/committee/matching"
                    className="btn-secondary a04-action-btn"
                    onClick={() => setSelectedMember(null)}
                  >
                    Assign Observers
                  </Link>
                )}

                <Link
                  to="/committee/unmatched"
                  className="btn-secondary a04-action-btn"
                  onClick={() => setSelectedMember(null)}
                >
                  Defer to Next Cycle
                </Link>
              </div>
            </div>

            <div className="a04-modal-footer">
              <button
                type="button"
                className="btn-primary a04-close-btn"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Popup for Academic Rank Change */}
      {pendingRankChange && (
        <div
          className="modal-backdrop a04-confirm-backdrop"
          onClick={() => !isUpdatingRank && setPendingRankChange(null)}
        >
          <div
            className="modal-card a04-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a04-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="a04-confirm-title" className="a04-confirm-title">
              Confirm Academic Rank Change
            </h3>
            <p className="a04-confirm-text">
              Are you sure you want to update{" "}
              <strong>{pendingRankChange.member.name}</strong>&apos;s academic
              rank from{" "}
              <strong>
                {formatAcademicRank(pendingRankChange.member.academic_rank)}
              </strong>{" "}
              to <strong>{formatAcademicRank(pendingRankChange.newRank)}</strong>
              ?
            </p>
            <div className="a04-confirm-actions">
              <button
                type="button"
                className="btn-secondary a04-action-btn"
                disabled={isUpdatingRank}
                onClick={() => setPendingRankChange(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary a04-close-btn"
                disabled={isUpdatingRank}
                onClick={() => void confirmRankChange()}
              >
                {isUpdatingRank ? "Updating..." : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}