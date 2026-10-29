import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

type AcademicRank =
  | "Assistant Professor"
  | "Associate Professor"
  | "Full Professor"
  | "Professor of Instruction";

interface MissingSurveyRecord {
  id: string;
  observeeName: string;
  department: string;
  academicLevel: AcademicRank;
  observationDate: string;
}

interface CompletedSurveyRecord {
  id: string;
  observeeName: string;
  observerName: string;
  department: string;
  academicLevel: AcademicRank;
  completionDate: string;
  courseAndSection: string;
  teachingEffectiveness: string;
  syllabusQuality: string;
  classroomManagement: string;
  overallRating: string;
  detailedComments: string;
}

export default function A06SurveyTracking() {
  const navigate = useNavigate();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"name" | "department" | "date">("name");

  // Selection States
  const [selectedMissing, setSelectedMissing] = useState<string[]>([]);

  // Modal States
  const [activeSurveyModal, setActiveSurveyModal] = useState<CompletedSurveyRecord | null>(null);
  const [showFullSurveyView, setShowFullSurveyView] = useState<boolean>(false);

  // Alert Feedback Banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Mock Data: Missing Surveys
  const [missingSurveys] = useState<MissingSurveyRecord[]>([
    {
      id: "m1",
      observeeName: "Professor A",
      department: "Computer Science",
      academicLevel: "Full Professor",
      observationDate: "10/12/2026",
    },
    {
      id: "m2",
      observeeName: "Professor B",
      department: "Computer Science",
      academicLevel: "Assistant Professor",
      observationDate: "10/15/2026",
    },
    {
      id: "m3",
      observeeName: "Professor C",
      department: "Electrical Engineering",
      academicLevel: "Associate Professor",
      observationDate: "10/18/2026",
    },
    {
      id: "m4",
      observeeName: "Professor D",
      department: "Mechanical Engineering",
      academicLevel: "Full Professor",
      observationDate: "10/20/2026",
    },
  ]);

  // Mock Data: Completed Surveys
  const [completedSurveys] = useState<CompletedSurveyRecord[]>([
    {
      id: "c1",
      observeeName: "Professor E",
      observerName: "Dr. Smith",
      department: "Computer Science",
      academicLevel: "Full Professor",
      completionDate: "10/22/2026",
      courseAndSection: "CS 4337.001",
      teachingEffectiveness: "Exceeds Expectations (5/5)",
      syllabusQuality: "Exceeds Expectations (5/5)",
      classroomManagement: "Meets Expectations (4/5)",
      overallRating: "Exceeds Expectations",
      detailedComments:
        "Extremely well-prepared lecture materials and engaged classroom interaction. The professor addressed student queries thoroughly and maintained excellent pacing throughout the session.",
    },
    {
      id: "c2",
      observeeName: "Professor F",
      observerName: "Dr. Johnson",
      department: "Electrical Engineering",
      academicLevel: "Assistant Professor",
      completionDate: "10/24/2026",
      courseAndSection: "EE 3302.002",
      teachingEffectiveness: "Meets Expectations (4/5)",
      syllabusQuality: "Exceeds Expectations (5/5)",
      classroomManagement: "Meets Expectations (4/5)",
      overallRating: "Meets Expectations",
      detailedComments:
        "Pacing was appropriate and students responded well to guided problem solving. Clear blackboard illustrations and concise explanation of complex concepts.",
    },
    {
      id: "c3",
      observeeName: "Professor G",
      observerName: "Dr. Williams",
      department: "Mechanical Engineering",
      academicLevel: "Full Professor",
      completionDate: "10/25/2026",
      courseAndSection: "MECH 2310.001",
      teachingEffectiveness: "Exceeds Expectations (5/5)",
      syllabusQuality: "Exceeds Expectations (5/5)",
      classroomManagement: "Exceeds Expectations (5/5)",
      overallRating: "Exceeds Expectations",
      detailedComments:
        "Demonstrated exemplary mastery of core concepts with high student participation. Excellent integration of practical engineering examples.",
    },
  ]);

  const handleSearchClick = () => {
    setSearchQuery(searchInput);
  };

  // Filtered Missing List
  const filteredMissing = useMemo(() => {
    let list = missingSurveys.filter((item) => {
      const matchesSearch =
        item.observeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept =
        selectedDepartment === "All" || item.department === selectedDepartment;
      return matchesSearch && matchesDept;
    });

    list.sort((a, b) => {
      if (sortBy === "name") return a.observeeName.localeCompare(b.observeeName);
      if (sortBy === "department") return a.department.localeCompare(b.department);
      if (sortBy === "date") return a.observationDate.localeCompare(b.observationDate);
      return 0;
    });

    return list;
  }, [missingSurveys, searchQuery, selectedDepartment, sortBy]);

  // Filtered Completed List
  const filteredCompleted = useMemo(() => {
    let list = completedSurveys.filter((item) => {
      const matchesSearch =
        item.observeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept =
        selectedDepartment === "All" || item.department === selectedDepartment;
      return matchesSearch && matchesDept;
    });

    list.sort((a, b) => {
      if (sortBy === "name") return a.observeeName.localeCompare(b.observeeName);
      if (sortBy === "department") return a.department.localeCompare(b.department);
      if (sortBy === "date") return a.completionDate.localeCompare(b.completionDate);
      return 0;
    });

    return list;
  }, [completedSurveys, searchQuery, selectedDepartment, sortBy]);

  // Bulk Selection Handlers for Missing Surveys
  const handleSelectAllMissing = () => {
    setSelectedMissing(filteredMissing.map((m) => m.id));
  };

  const handleDeselectAllMissing = () => {
    setSelectedMissing([]);
  };

  const handleToggleMissing = (id: string) => {
    setSelectedMissing((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Notification Dispatch Action
  const handleSendNotifications = () => {
    if (selectedMissing.length === 0) {
      alert("Please select at least one faculty member to dispatch a survey deadline notification.");
      return;
    }

    setFeedbackMessage(
      `Survey deadline notifications successfully dispatched to ${selectedMissing.length} faculty member(s).`
    );
    setSelectedMissing([]);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Open Details Modal
  const handleOpenModal = (record: CompletedSurveyRecord) => {
    setActiveSurveyModal(record);
    setShowFullSurveyView(false);
  };

  const handleCloseModal = () => {
    setActiveSurveyModal(null);
    setShowFullSurveyView(false);
  };

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Return to Dashboard
        </Link>
      </div>

      <h2>Post-Evaluation Survey Tracking</h2>

      {/* Success/Action Feedback Banner */}
      {feedbackMessage ? (
        <div role="status" className="yellow-banner">
          <strong>Success:</strong> {feedbackMessage}
        </div>
      ) : (
        <div className="yellow-banner">
          <strong>REMINDER:</strong> Faculty members have until Dec 1 to complete and submit their surveys.
        </div>
      )}

      {/* Unified Search & Filter Control Bar */}
      <div className="roster-controls-row controls-row-spacing">
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
          <label>Filter Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="styled-select-input"
          >
            <option value="All">All Departments</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electrical Engineering">Electrical Engineering</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
          </select>
        </div>

        <div className="sort-control-group">
          <label>Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "department" | "date")}
            className="styled-select-input"
          >
            <option value="name">Name</option>
            <option value="department">Department</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: MISSING POST-EVALUATION SURVEYS */}
      <section className="dashboard-phase missing-surveys-phase">
        <h3>Missing Post-Evaluation Surveys</h3>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select a Professor's name to dispatch a survey deadline notification.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th className="col-checkbox">Select</th>
                  <th>Observee Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Observation Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredMissing.map((record) => {
                  const isSelected = selectedMissing.includes(record.id);
                  return (
                    <tr key={record.id}>
                      <td className="align-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleMissing(record.id)}
                          aria-label={`Select ${record.observeeName}`}
                        />
                      </td>
                      <td>{record.observeeName}</td>
                      <td>{record.department}</td>
                      <td>{record.academicLevel}</td>
                      <td>{record.observationDate}</td>
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
              onClick={handleSelectAllMissing}
            >
              Select All
            </button>
            <button
              type="button"
              className="btn-select-toggle"
              onClick={handleDeselectAllMissing}
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSendNotifications}
          >
            Send Notifications
          </button>
        </div>
      </section>

      {/* SECTION 2: VIEW COMPLETED POST-EVALUATION SURVEYS */}
      <section className="dashboard-phase phase-spacing">
        <h3>View Completed Post-Evaluation Surveys</h3>

        <div className="table-container theme-green">
          <div className="table-instruction">
            Select View Details to see a summary of the completed survey.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Observee Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Completion Date</th>
                  <th className="align-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompleted.map((record) => (
                  <tr key={record.id}>
                    <td>{record.observeeName}</td>
                    <td>{record.department}</td>
                    <td>{record.academicLevel}</td>
                    <td>{record.completionDate}</td>
                    <td className="align-center">
                      <button
                        type="button"
                        className="table-name-link"
                        onClick={() => handleOpenModal(record)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Standardized Bottom Return Button */}
      <div className="dashboard-center-action">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate("/committee/dashboard")}
        >
          Return to Dashboard
        </button>
      </div>

      {/* POP-UP MODAL: SURVEY DETAILS SUMMARY WITH LINK TO FULL SURVEY */}
      {activeSurveyModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3>
                {showFullSurveyView
                  ? "Entire Completed Post-Evaluation Survey"
                  : "Survey Record Details"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="modal-close-x"
              >
                &times;
              </button>
            </div>

            <div className="modal-details-list">
              <div className="modal-detail-row">
                <span className="detail-label">Candidate Name:</span>
                <span className="detail-value-bold">{activeSurveyModal.observeeName}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Observer Name:</span>
                <span>{activeSurveyModal.observerName}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Department:</span>
                <span>{activeSurveyModal.department}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Academic Rank:</span>
                <span>{activeSurveyModal.academicLevel}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Course & Section:</span>
                <span>{activeSurveyModal.courseAndSection}</span>
              </div>

              <div className="modal-detail-row">
                <span className="detail-label">Completion Date:</span>
                <span>{activeSurveyModal.completionDate}</span>
              </div>

              {/* Extended breakdown when "View Entire Survey" link is clicked */}
              {showFullSurveyView ? (
                <>
                  <hr className="modal-divider" />
                  <div className="modal-detail-row">
                    <span className="detail-label">Teaching Effectiveness:</span>
                    <span>{activeSurveyModal.teachingEffectiveness}</span>
                  </div>
                  <div className="modal-detail-row">
                    <span className="detail-label">Course Material & Syllabus:</span>
                    <span>{activeSurveyModal.syllabusQuality}</span>
                  </div>
                  <div className="modal-detail-row">
                    <span className="detail-label">Classroom Management:</span>
                    <span>{activeSurveyModal.classroomManagement}</span>
                  </div>
                  <div className="modal-detail-row">
                    <span className="detail-label">Overall Rating:</span>
                    <span className="rating-highlight">
                      {activeSurveyModal.overallRating}
                    </span>
                  </div>
                  <div className="modal-comments-wrapper">
                    <span className="detail-label block-label">
                      Detailed Comments:
                    </span>
                    <p className="comments-box">
                      {activeSurveyModal.detailedComments}
                    </p>
                  </div>
                </>
              ) : (
                /* Link at the bottom to expand/view the full survey */
                <div className="modal-expand-action">
                  <button
                    type="button"
                    onClick={() => setShowFullSurveyView(true)}
                    className="modal-expand-link"
                  >
                    View Entire Survey Details →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}