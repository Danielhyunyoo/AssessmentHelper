import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

type AcademicRank =
  | "Assistant Professor"
  | "Associate Professor"
  | "Full Professor"
  | "Professor of Instruction";

interface RosterMember {
  id: string;
  observeeName: string;
  courseAndSection: string;
  academicLevel: AcademicRank;
  enrollmentStatus: "Registered" | "Ongoing Observation" | "Complete" | "Not Registered";
  email: string;
  department: string;
  avatarUrl?: string;
}

interface UnregisteredMember {
  id: string;
  professorName: string;
  department: string;
  academicLevel: AcademicRank;
  lastObservationDate: string;
}

export default function A04FacultyRoster() {
  const navigate = useNavigate();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "status" | "rank">("name");

  // Selection state for Unregistered Observees
  const [selectedUnregistered, setSelectedUnregistered] = useState<string[]>([]);

  // Alert Feedback Banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal States
  const [selectedFaculty, setSelectedFaculty] = useState<RosterMember | null>(null);
  const [pendingRankChange, setPendingRankChange] = useState<{
    member: RosterMember;
    newRank: AcademicRank;
  } | null>(null);

  // Sample Data: Active Cycle Roster
  const [facultyRoster, setFacultyRoster] = useState<RosterMember[]>([
    {
      id: "f1",
      observeeName: "Professor A",
      courseAndSection: "Not Registered",
      academicLevel: "Assistant Professor",
      enrollmentStatus: "Not Registered",
      email: "professor.a@utdallas.edu",
      department: "Computer Science",
      avatarUrl: "https://via.placeholder.com/64?text=Prof+A",
    },
    {
      id: "f2",
      observeeName: "Professor B",
      courseAndSection: "CS 4337.002",
      academicLevel: "Assistant Professor",
      enrollmentStatus: "Ongoing Observation",
      email: "professor.b@utdallas.edu",
      department: "Computer Science",
      avatarUrl: "https://via.placeholder.com/64?text=Prof+B",
    },
    {
      id: "f3",
      observeeName: "Professor C",
      courseAndSection: "CS 1200.001",
      academicLevel: "Full Professor",
      enrollmentStatus: "Complete",
      email: "professor.c@utdallas.edu",
      department: "Computer Science",
      avatarUrl: "https://via.placeholder.com/64?text=Prof+C",
    },
    {
      id: "f4",
      observeeName: "Professor D",
      courseAndSection: "CS 2336.006",
      academicLevel: "Full Professor",
      enrollmentStatus: "Registered",
      email: "professor.d@utdallas.edu",
      department: "Computer Science",
      avatarUrl: "https://via.placeholder.com/64?text=Prof+D",
    },
    {
      id: "f5",
      observeeName: "Professor E",
      courseAndSection: "CS 4349.002",
      academicLevel: "Full Professor",
      enrollmentStatus: "Registered",
      email: "professor.e@utdallas.edu",
      department: "Computer Science",
      avatarUrl: "https://via.placeholder.com/64?text=Prof+E",
    },
  ]);

  // Sample Data: Unregistered Faculty
  const [unregisteredList] = useState<UnregisteredMember[]>([
    {
      id: "u1",
      professorName: "Professor F",
      department: "Computer Science",
      academicLevel: "Assistant Professor",
      lastObservationDate: "XX/XX/XXXX",
    },
    {
      id: "u2",
      professorName: "Professor G",
      department: "Computer Science",
      academicLevel: "Associate Professor",
      lastObservationDate: "XX/XX/XXXX",
    },
    {
      id: "u3",
      professorName: "Professor H",
      department: "Computer Science",
      academicLevel: "Full Professor",
      lastObservationDate: "XX/XX/XXXX",
    },
  ]);

  const handleSearchClick = () => {
    setSearchQuery(searchInput);
  };

  const filteredRoster = useMemo(() => {
    let list = facultyRoster.filter(
      (m) =>
        m.observeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.courseAndSection.toLowerCase().includes(searchQuery.toLowerCase())
    );

    list.sort((a, b) => {
      if (sortBy === "name") return a.observeeName.localeCompare(b.observeeName);
      if (sortBy === "status") return a.enrollmentStatus.localeCompare(b.enrollmentStatus);
      if (sortBy === "rank") return a.academicLevel.localeCompare(b.academicLevel);
      return 0;
    });

    return list;
  }, [facultyRoster, searchQuery, sortBy]);

  const handleOpenProfileModal = (member: RosterMember) => {
    setSelectedFaculty({ ...member });
  };

  const handleCloseProfileModal = () => {
    setSelectedFaculty(null);
  };

  const handleStageRankChange = (newRank: AcademicRank) => {
    if (selectedFaculty && selectedFaculty.academicLevel !== newRank) {
      setPendingRankChange({
        member: selectedFaculty,
        newRank,
      });
    }
  };

  const handleConfirmRankChange = () => {
    if (!pendingRankChange) return;

    const { member, newRank } = pendingRankChange;

    setFacultyRoster((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, academicLevel: newRank } : m))
    );

    setFeedbackMessage(
      `Successfully updated ${member.observeeName}'s academic rank to "${newRank}".`
    );

    setSelectedFaculty((prev) => (prev ? { ...prev, academicLevel: newRank } : null));
    setPendingRankChange(null);

    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleCancelRankChange = () => {
    setPendingRankChange(null);
  };

  const handleSelectAll = () => {
    setSelectedUnregistered(unregisteredList.map((u) => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedUnregistered([]);
  };

  const handleToggleUnregistered = (id: string) => {
    setSelectedUnregistered((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendReminders = () => {
    if (selectedUnregistered.length === 0) {
      alert("Please select at least one unregistered observee to send a reminder.");
      return;
    }

    setFeedbackMessage(
      `Registration reminders sent to ${selectedUnregistered.length} observee(s).`
    );
    setSelectedUnregistered([]);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Return to Dashboard
        </Link>
      </div>

      <h2>Faculty Registration and Communications</h2>

      {/* Success Banner */}
      {feedbackMessage && (
        <div role="status" className="yellow-banner">
          <strong>Success:</strong> {feedbackMessage}
        </div>
      )}

      {/* SECTION 1: FACULTY ROSTER */}
      <section className="dashboard-phase">
        <h3>This Cycle's Faculty Roster</h3>

        <ul className="instruction-bullet-list">
          <li>
            <em>Make use of this list to view details or contact (email) faculty members.</em>
          </li>
          <li>
            <em>Click on a faculty member's name to view profile details or update their academic level.</em>
          </li>
        </ul>

        {/* Search & Sort Controls Bar */}
        <div className="roster-controls-row">
          <div className="search-control-group">
            <label>Search by Faculty Name:</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Begin typing here..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="styled-text-input"
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleSearchClick}
              >
                Search
              </button>
            </div>
          </div>

          <div className="sort-control-group">
            <label>Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "status" | "rank")}
              className="styled-select-input"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="rank">Academic Level</option>
            </select>
          </div>
        </div>

        {/* Green Theme Table Box */}
        <div className="table-container theme-green">
          <div className="table-instruction">
            Select an Observee's name to view their full profile.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Observee Name</th>
                  <th>Course and Section</th>
                  <th>Academic Level</th>
                  <th>Enrollment Status</th>
                  <th className="align-center">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(member)}
                        className="table-name-link"
                      >
                        {member.observeeName}
                      </button>
                    </td>
                    <td>{member.courseAndSection}</td>
                    <td>{member.academicLevel}</td>
                    <td>{member.enrollmentStatus}</td>
                    <td className="align-center">
                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(member)}
                        className="table-arrow-btn"
                        title="View Profile Details"
                      >
                        ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: UNREGISTERED OBSERVEES */}
      <section className="dashboard-phase phase-spacing">
        <h3>Unregistered Observees (Pending Reminders)</h3>

        <ul className="instruction-bullet-list">
          <li>
            <em>Faculty members below are due for evaluation in this cycle but have not yet registered a course section.</em>
          </li>
          <li>
            <em>If selected in the next section, they will receive a reminder to register by the deadline (Oct 9).</em>
          </li>
        </ul>

        {/* Orange Theme Table Box */}
        <div className="table-container theme-orange">
          <div className="table-instruction">
            Select observees to send a registration reminder.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th className="col-checkbox">Select</th>
                  <th>Professor Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Last Observation Date</th>
                </tr>
              </thead>
              <tbody>
                {unregisteredList.map((prof) => {
                  const isSelected = selectedUnregistered.includes(prof.id);
                  return (
                    <tr key={prof.id}>
                      <td className="align-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUnregistered(prof.id)}
                        />
                      </td>
                      <td className="font-semibold">{prof.professorName}</td>
                      <td>{prof.department}</td>
                      <td>{prof.academicLevel}</td>
                      <td>{prof.lastObservationDate}</td>
                    </tr>
                  );
                })}
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
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="btn-select-toggle"
              onClick={handleDeselectAll}
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSendReminders}
          >
            Send Registration Reminders
          </button>
        </div>
      </section>

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>

      {/* POP-UP MODAL 1: FACULTY PROFILE & DETAILS (NO BOTTOM CLOSE BUTTON) */}
      {selectedFaculty && (
        <div className="modal-overlay" onClick={handleCloseProfileModal}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="modal-title-avatar-group">
                {selectedFaculty.avatarUrl && (
                  <img
                    src={selectedFaculty.avatarUrl}
                    alt={selectedFaculty.observeeName}
                    className="modal-pfp"
                  />
                )}
                <h3>Faculty Profile & Details</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseProfileModal}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <div className="modal-details-list">
              <div className="modal-detail-row">
                <span className="detail-label">Faculty Name:</span>
                <span className="detail-value-bold">{selectedFaculty.observeeName}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Department:</span>
                <span>{selectedFaculty.department}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Email:</span>
                <span>{selectedFaculty.email}</span>
              </div>

              {/* Homogeneous Rank Row */}
              <div className="modal-detail-row align-items-center">
                <span className="detail-label">Academic Rank:</span>
                <select
                  value={selectedFaculty.academicLevel}
                  onChange={(e) => handleStageRankChange(e.target.value as AcademicRank)}
                  className="modal-inline-select"
                >
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Full Professor">Full Professor</option>
                  <option value="Professor of Instruction">Professor of Instruction</option>
                </select>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Active Course:</span>
                <span>{selectedFaculty.courseAndSection}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Status:</span>
                <span>{selectedFaculty.enrollmentStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL 2: CONFIRMATION POPUP */}
      {pendingRankChange && (
        <div className="modal-overlay modal-high-z" onClick={handleCancelRankChange}>
          <div className="modal-content-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3>Confirm Rank Modification</h3>
              <button
                type="button"
                onClick={handleCancelRankChange}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <div className="modal-body-text">
              <p className="confirm-main-text">
                Are you sure you want to change <strong>{pendingRankChange.member.observeeName}</strong>'s academic rank to{" "}
                <strong>"{pendingRankChange.newRank}"</strong>?
              </p>
              <p className="confirm-sub-text">
                This will update their official record and evaluation cycle timing configuration.
              </p>
            </div>

            <div className="modal-footer-split">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelRankChange}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmRankChange}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}